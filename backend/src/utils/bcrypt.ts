import bcrypt from "bcrypt"

export const hashValue = (value: string, saltOrRound?: number) => bcrypt.hash(value, saltOrRound || 10)

export const compareValue = (value: string, hashValue: string) => bcrypt.compare(value, hashValue).catch(() => false)