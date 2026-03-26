import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import cartRouter from "./cart";
import authRouter from "./auth";
import dealsRouter from "./deals";
import wishlistRouter from "./wishlist";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(cartRouter);
router.use(authRouter);
router.use(dealsRouter);
router.use(wishlistRouter);
router.use(adminRouter);

export default router;
