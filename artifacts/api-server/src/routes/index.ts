import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import cartRouter from "./cart";
import authRouter from "./auth";
import dealsRouter from "./deals";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(cartRouter);
router.use(authRouter);
router.use(dealsRouter);

export default router;
