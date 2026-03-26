import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import cartRouter from "./cart";
import authRouter from "./auth";
import dealsRouter from "./deals";
import wishlistRouter from "./wishlist";
import adminRouter from "./admin";
import branchesRouter from "./branches";
import accessCodesRouter from "./access-codes";
import branchProductsRouter from "./branch-products";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(cartRouter);
router.use(authRouter);
router.use(dealsRouter);
router.use(wishlistRouter);
router.use(adminRouter);
router.use(branchesRouter);
router.use(accessCodesRouter);
router.use(branchProductsRouter);

export default router;
