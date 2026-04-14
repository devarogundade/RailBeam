import type { IUsers } from "../interfaces/users";
import type { GetUser, GetUserByUsername, GetUsers, User } from "../types";
import { BaseUsers } from "./base";

export class Users extends BaseUsers implements IUsers {
  getUser(params: GetUser): Promise<User | null> {
    return this.graph.getUser(params.user);
  }

  getUserByUsername(params: GetUserByUsername): Promise<User | null> {
    return this.graph.getUserByUsername(params.username);
  }

  getUsers(params: GetUsers): Promise<User[]> {
    return this.graph.getUsers(params.page, params.limit);
  }
}

