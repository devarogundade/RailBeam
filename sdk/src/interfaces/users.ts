import type { GetUser, GetUserByUsername, GetUsers, User } from "../types";

export interface IUsers {
  getUser(params: GetUser): Promise<User | null>;
  getUserByUsername(params: GetUserByUsername): Promise<User | null>;
  getUsers(params: GetUsers): Promise<User[]>;
}

