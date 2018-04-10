import * as supertest from 'supertest'
import { Application, initialize } from '../../src/index'
import { CreateUser, UserModel } from '../../src/server/users/model'

export const SERVER_URL = `localhost:${process.env.PORT || 8080}`
let appTest: Application

export async function getServerTest() {
  if (!appTest) {
    appTest = await initialize()
  }

  return appTest
}

export async function truncateTables() {
  if (!appTest) {
    appTest = await initialize()
  }

  const conn = await appTest.database.getConnection()

  return appTest
}

export async function createUserTest(user: CreateUser): Promise<UserModel> {
  const app = await appTest
  const res = await supertest(app.server)
    .post('/api/v1/users')
    .send(user)
    .expect(201)

  return res.body
}

export async function getLoginToken(
  email: string,
  password: string
): Promise<string> {
  const res = await supertest(SERVER_URL)
    .post('/api/v1/users/login')
    .send({ email, password })
    .expect(200)

  return res.body.accessToken
}
