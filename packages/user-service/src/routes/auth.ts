import {Router, Request, Response} from "express";
import bcrypt from "bcrypt";
import { 
    generateToken,
    validate,
    userRegistrationSchema,
    userLoginSchema,
    asyncHandler,
    AppError,
    logger
 } from "@e-commerce/shared/index.js";