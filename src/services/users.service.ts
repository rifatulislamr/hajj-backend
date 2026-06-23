import { db } from "../config/database";
import { userModel } from "../schemas";

export const getUsers = async () => {
    const userList = await db.select().from(userModel);
  
    return userList;
  };