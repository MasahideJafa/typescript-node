import { Server } from 'http'
import * as pino from 'pino'
import { createContainer } from './container'
import { AppError } from './errors'
import { MySql } from './lib/database'
import * as server from './server'

export interface Application {
  logger: pino.Logger
  database: MySql
  server: Server
}

function registerProcessEvents(app: Application) {
  process.on('uncaughtException', (error: Error) => {
    app.logger.error('UncaughtException', error)
  })

  process.on('unhandledRejection', (reason: any, promise: any) => {
    app.logger.info(reason, promise)
  })

  process.on('SIGTERM', async () => {
    app.logger.info('Starting graceful shutdown')

    let exitCode = 0
    const shutdown = [
      server.closeServer(app.server),
      app.database.closeDatabase()
    ]

    for (const s of shutdown) {
      try {
        await s
      } catch (e) {
        app.logger.error('Error in graceful shutdown ', e)
        exitCode = 1
      }
    }

    process.exit(exitCode)
  })
}

export async function initialize(): Promise<Application> {
  const logger = pino()

  try {
    // Starting the HTTP server
    logger.info('Starting HTTP server')

    const database = new MySql({
      database: 'task_manager',
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      debug: process.env.ENV !== 'production'
    })

    logger.info('Apply database migration')
    await database.schemaMigration()

    const port = process.env.PORT || 8080
    const container = createContainer(database, logger)
    const appServer = server.createServer(container).listen(port)

    logger.info(`Application running on port: ${port}`)

    return { logger, database, server: appServer }
  } catch (ex) {
    throw new AppError(
      10000,
      'An error occurred while initializing application.',
      ex
    )
  }
}

// tslint:disable-next-line:prettier
(async () => {
  const app = await initialize()

  // Register global process events and graceful shutdown
  registerProcessEvents(app)
})()
