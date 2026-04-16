import { PrismaClient } from '@prisma/client'

let prismaClient: PrismaClient | undefined

export function getDbClient() {
  if (!prismaClient) {
    prismaClient = new PrismaClient()
  }

  return prismaClient
}
