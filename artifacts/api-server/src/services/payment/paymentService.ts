export interface WebhookResult {
  status: "success" | "failed";
  transactionId: string;
  userEmail: string;
}

export interface PaymentAdapter {
  createCheckoutSession(
    amount: number,
    currency: string,
    userEmail: string,
  ): Promise<{ checkoutUrl: string }>;

  verifyWebhook(
    requestBody: Buffer | string,
    signatureHeader: string,
  ): Promise<WebhookResult>;
}

let _adapter: PaymentAdapter | null = null;

export function getPaymentAdapter(): PaymentAdapter {
  if (_adapter) return _adapter;

  const provider = (process.env.ACTIVE_PAYMENT ?? "stripe").toLowerCase();

  switch (provider) {
    case "stripe": {
      const { stripeAdapter } = require("./stripeAdapter");
      _adapter = stripeAdapter;
      break;
    }
    case "amarpay": {
      const { amarpayAdapter } = require("./amarpayAdapter");
      _adapter = amarpayAdapter;
      break;
    }
    case "lemonsqueezy": {
      const { lemonAdapter } = require("./lemonAdapter");
      _adapter = lemonAdapter;
      break;
    }
    case "paypal": {
      const { paypalAdapter } = require("./paypalAdapter");
      _adapter = paypalAdapter;
      break;
    }
    case "sslcommerz": {
      const { sslcommerzAdapter } = require("./sslcommerzAdapter");
      _adapter = sslcommerzAdapter;
      break;
    }
    default:
      throw new Error(
        `[paymentService] Unknown ACTIVE_PAYMENT provider: "${provider}". ` +
          `Valid options: stripe, amarpay, lemonsqueezy, paypal, sslcommerz`,
      );
  }

  return _adapter!;
}
