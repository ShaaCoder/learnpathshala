import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

async function sha512(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);

  const hashBuffer = await crypto.subtle.digest(
    "SHA-512",
    data
  );

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) =>
      byte.toString(16).padStart(2, "0")
    )
    .join("");
}

function generateTransactionId(
  prefix: string
): string {
  const randomPart = crypto
    .randomUUID()
    .replace(/-/g, "")
    .substring(0, 23);

  return `${prefix}${randomPart}`.substring(0, 25);
}

function cleanName(value: unknown): string {
  const name = String(value || "").trim();

  if (!name) {
    return "Student";
  }

  return name.substring(0, 60);
}

Deno.serve(async (req: Request) => {
  /*
   * =========================================================
   * CORS
   * =========================================================
   */

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed",
      },
      405
    );
  }

  try {
    /*
     * =========================================================
     * ENVIRONMENT
     * =========================================================
     */

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const supabaseAnonKey =
      Deno.env.get("SUPABASE_ANON_KEY");

    const supabaseServiceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (
      !supabaseUrl ||
      !supabaseAnonKey ||
      !supabaseServiceRoleKey
    ) {
      console.error(
        "Missing Supabase environment variables"
      );

      return jsonResponse(
        {
          error:
            "Server configuration error.",
        },
        500
      );
    }

    /*
     * =========================================================
     * AUTHORIZATION
     * =========================================================
     */

    const authorization =
      req.headers.get("Authorization");

    if (!authorization) {
      return jsonResponse(
        {
          error:
            "Authorization header required.",
        },
        401
      );
    }

    /*
     * User client
     */
    const userClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
      }
    );

    /*
     * Admin/service client
     */
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    );

    /*
     * =========================================================
     * VERIFY USER
     * =========================================================
     */

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      console.error(
        "Auth error:",
        userError
      );

      return jsonResponse(
        {
          error:
            "Unauthorized. Please login again.",
        },
        401
      );
    }

    /*
     * =========================================================
     * REQUEST BODY
     * =========================================================
     */

    let body: Record<string, unknown> = {};

    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        {
          error:
            "Invalid JSON request body.",
        },
        400
      );
    }

    const courseId =
      typeof body?.courseId === "string"
        ? body.courseId.trim()
        : "";

    const mockTestId =
      typeof body?.mockTestId === "string"
        ? body.mockTestId.trim()
        : "";

    /*
     * =========================================================
     * VALIDATE PAYMENT TYPE
     * =========================================================
     */

    if (!courseId && !mockTestId) {
      return jsonResponse(
        {
          error:
            "courseId or mockTestId is required.",
        },
        400
      );
    }

    if (courseId && mockTestId) {
      return jsonResponse(
        {
          error:
            "Send either courseId or mockTestId, not both.",
        },
        400
      );
    }

    /*
     * =========================================================
     * PAYMENT SETTINGS
     * =========================================================
     */

    const {
      data: paymentSettings,
      error: paymentSettingsError,
    } = await supabaseAdmin
      .from("payment_settings")
      .select(
        "id, merchant_key, merchant_salt, test_mode"
      )
      .eq("id", 1)
      .maybeSingle();

    if (paymentSettingsError) {
      console.error(
        "Payment settings error:",
        paymentSettingsError
      );

      return jsonResponse(
        {
          error:
            "Could not load payment settings.",
          details:
            paymentSettingsError.message,
        },
        500
      );
    }

    if (
      !paymentSettings?.merchant_key ||
      !paymentSettings?.merchant_salt
    ) {
      return jsonResponse(
        {
          error:
            "PayU merchant key/salt is not configured.",
        },
        500
      );
    }

    const merchantKey = String(
      paymentSettings.merchant_key
    ).trim();

    const merchantSalt = String(
      paymentSettings.merchant_salt
    ).trim();

    const isTest = Boolean(
      paymentSettings.test_mode
    );

    /*
     * =========================================================
     * USER PROFILE
     * =========================================================
     */

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.warn(
        "Profile fetch warning:",
        profileError
      );
    }

    const firstname = cleanName(
      profile?.full_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        "Student"
    );

    const email = String(
      profile?.email ||
        user.email ||
        ""
    ).trim();

    if (!email) {
      return jsonResponse(
        {
          error:
            "Student email is required for payment.",
        },
        400
      );
    }

    const phone = String(
      user.user_metadata?.phone ||
        ""
    ).trim();

    /*
     * =========================================================
     * PAYU CALLBACK
     * =========================================================
     *
     * PayU will POST the payment response here.
     */

    const webhookUrl =
      `${supabaseUrl}/functions/v1/payu-webhook`;

    /*
     * =========================================================
     * PAYU PAYMENT URL
     * =========================================================
     *
     * IMPORTANT:
     * Do NOT put Markdown links here.
     */

    const payuUrl = isTest
      ? "https://test.payu.in/_payment"
      : "https://secure.payu.in/_payment";

    /*
     * =========================================================
     * COMMON PAYMENT VARIABLES
     * =========================================================
     */

    let txnid = "";
    let amount = "";
    let productinfo = "";

    let udf1 = "";
    let udf2 = "";
    let udf3 = "";
    let udf4 = "";
    let udf5 = "";

    let paymentType = "";

    /*
     * =========================================================
     * COURSE PAYMENT
     * =========================================================
     */

    if (courseId) {
      paymentType = "course";

      /*
       * Existing course payment RPC.
       */
      const {
        data: transaction,
        error: transactionError,
      } = await userClient.rpc(
        "create_payment_transaction",
        {
          p_course_id: courseId,
        }
      );

      if (transactionError) {
        console.error(
          "Course transaction RPC error:",
          transactionError
        );

        return jsonResponse(
          {
            error:
              transactionError.message ||
              "Could not create payment transaction.",
            code:
              transactionError.code,
            details:
              transactionError.details,
            hint:
              transactionError.hint,
          },
          400
        );
      }

      if (!transaction) {
        return jsonResponse(
          {
            error:
              "Payment transaction was not created.",
          },
          400
        );
      }

      console.log(
        "Course transaction:",
        transaction
      );

      /*
       * RPC may return object or array.
       */
      const txn =
        Array.isArray(transaction)
          ? transaction[0]
          : transaction;

      if (!txn) {
        return jsonResponse(
          {
            error:
              "Invalid transaction response.",
          },
          500
        );
      }

      /*
       * Amount
       */
      amount = Number(
        txn.amount
      ).toFixed(2);

      /*
       * Transaction ID
       */
      txnid = String(
        txn.txnid ||
          txn.transaction_id ||
          ""
      ).trim();

      /*
       * Product information
       */
      productinfo = String(
        txn.course_title ||
          txn.title ||
          "Course Payment"
      ).trim();

      /*
       * Validate transaction
       */
      if (!txnid) {
        return jsonResponse(
          {
            error:
              "Transaction ID was not generated.",
          },
          500
        );
      }

      if (
        !amount ||
        Number(amount) <= 0
      ) {
        return jsonResponse(
          {
            error:
              "Invalid payment amount.",
          },
          400
        );
      }

      /*
       * UDF values
       *
       * udf1 = course ID
       * udf2 = student ID
       * udf3 = payment type
       */
      udf1 = courseId;
      udf2 = user.id;
      udf3 = "course";
    }

    /*
     * =========================================================
     * MOCK TEST PAYMENT
     * =========================================================
     */

    if (mockTestId) {
      paymentType = "mock_test";

      /*
       * -------------------------------------------------------
       * LOAD MOCK TEST
       * -------------------------------------------------------
       */

      const {
        data: mockTest,
        error: mockTestError,
      } = await supabaseAdmin
        .from("mock_tests")
        .select(
          "id, title, price, is_free, status"
        )
        .eq("id", mockTestId)
        .maybeSingle();

      if (mockTestError) {
        console.error(
          "Mock test fetch error:",
          mockTestError
        );

        return jsonResponse(
          {
            error:
              "Could not load mock test.",
            details:
              mockTestError.message,
            code:
              mockTestError.code,
          },
          500
        );
      }

      if (!mockTest) {
        return jsonResponse(
          {
            error:
              "Mock test not found.",
          },
          404
        );
      }

      /*
       * -------------------------------------------------------
       * TEST STATUS
       * -------------------------------------------------------
       */

      if (
        mockTest.status !==
        "published"
      ) {
        return jsonResponse(
          {
            error:
              "This mock test is not available for purchase.",
          },
          400
        );
      }

      /*
       * -------------------------------------------------------
       * FREE TEST
       * -------------------------------------------------------
       */

      if (mockTest.is_free) {
        return jsonResponse(
          {
            error:
              "This mock test is free.",
          },
          400
        );
      }

      /*
       * -------------------------------------------------------
       * PRICE
       * -------------------------------------------------------
       */

      const mockPrice = Number(
        mockTest.price
      );

      if (
        !Number.isFinite(mockPrice) ||
        mockPrice <= 0
      ) {
        return jsonResponse(
          {
            error:
              "Invalid mock test price.",
          },
          400
        );
      }

      /*
       * -------------------------------------------------------
       * CHECK EXISTING PURCHASE
       * -------------------------------------------------------
       *
       * IMPORTANT:
       *
       * mock_test_purchases has:
       *
       * UNIQUE(student_id, test_id)
       *
       * Therefore we MUST NOT only check "success"
       * and then blindly INSERT.
       */

      const {
        data: existingPurchase,
        error: purchaseCheckError,
      } = await supabaseAdmin
        .from("mock_test_purchases")
        .select(
          `
          id,
          payment_status,
          amount,
          payment_transaction_id
          `
        )
        .eq(
          "test_id",
          mockTestId
        )
        .eq(
          "student_id",
          user.id
        )
        .maybeSingle();

      if (purchaseCheckError) {
        console.error(
          "Existing purchase check error:",
          purchaseCheckError
        );

        return jsonResponse(
          {
            error:
              "Could not check existing payment record.",
            details:
              purchaseCheckError.message,
            code:
              purchaseCheckError.code,
            hint:
              purchaseCheckError.hint,
          },
          500
        );
      }

      /*
       * -------------------------------------------------------
       * ALREADY SUCCESSFUL
       * -------------------------------------------------------
       */

      if (
        existingPurchase &&
        existingPurchase.payment_status ===
          "success"
      ) {
        return jsonResponse(
          {
            error:
              "You have already purchased this mock test.",
          },
          400
        );
      }

      /*
       * -------------------------------------------------------
       * GENERATE PAYU TRANSACTION
       * -------------------------------------------------------
       */

      txnid =
        generateTransactionId("MT");

      amount =
        mockPrice.toFixed(2);

      productinfo =
        String(
          mockTest.title ||
            "Mock Test"
        ).trim();

      /*
       * -------------------------------------------------------
       * UDF VALUES
       * -------------------------------------------------------
       *
       * udf1 = mock test ID
       * udf2 = student ID
       * udf3 = mock_test
       */

      udf1 = mockTestId;
      udf2 = user.id;
      udf3 = "mock_test";

      /*
       * -------------------------------------------------------
       * EXISTING PENDING / FAILED / CANCELLED RECORD
       * -------------------------------------------------------
       *
       * Reuse it because of:
       *
       * UNIQUE(student_id, test_id)
       */

      if (existingPurchase) {
        console.log(
          "Existing mock purchase found:",
          {
            id:
              existingPurchase.id,
            oldStatus:
              existingPurchase.payment_status,
          }
        );

        const {
          error:
            updatePurchaseError,
        } = await supabaseAdmin
          .from(
            "mock_test_purchases"
          )
          .update({
            amount:
              mockPrice,

            payment_status:
              "pending",

            payment_transaction_id:
              null,

            paid_at:
              null,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            existingPurchase.id
          );

        if (updatePurchaseError) {
          console.error(
            "Mock purchase update error:",
            updatePurchaseError
          );

          return jsonResponse(
            {
              error:
                "Could not reset payment record.",
              details:
                updatePurchaseError.message,
              code:
                updatePurchaseError.code,
              hint:
                updatePurchaseError.hint,
            },
            500
          );
        }

        console.log(
          "Mock purchase reset to pending:",
          existingPurchase.id
        );
      } else {
        /*
         * -----------------------------------------------------
         * CREATE NEW PURCHASE RECORD
         * -----------------------------------------------------
         */

        const {
          error:
            pendingPurchaseError,
        } = await supabaseAdmin
          .from(
            "mock_test_purchases"
          )
          .insert({
            test_id:
              mockTestId,

            student_id:
              user.id,

            amount:
              mockPrice,

            payment_status:
              "pending",
          });

        if (pendingPurchaseError) {
          console.error(
            "Pending mock purchase insert error:",
            pendingPurchaseError
          );

          return jsonResponse(
            {
              error:
                "Could not create payment record.",
              details:
                pendingPurchaseError.message,
              code:
                pendingPurchaseError.code,
              hint:
                pendingPurchaseError.hint,
            },
            500
          );
        }

        console.log(
          "New mock purchase created:",
          {
            testId:
              mockTestId,
            studentId:
              user.id,
            amount:
              mockPrice,
          }
        );
      }
    }

    /*
     * =========================================================
     * FINAL VALIDATION
     * =========================================================
     */

    if (!txnid) {
      return jsonResponse(
        {
          error:
            "Transaction ID is missing.",
        },
        500
      );
    }

    if (!amount) {
      return jsonResponse(
        {
          error:
            "Payment amount is missing.",
        },
        500
      );
    }

    if (!productinfo) {
      return jsonResponse(
        {
          error:
            "Product information is missing.",
        },
        500
      );
    }

    /*
     * =========================================================
     * PAYU REQUEST HASH
     * =========================================================
     *
     * PayU Hosted Checkout:
     *
     * key|txnid|amount|productinfo|firstname|email|
     * udf1|udf2|udf3|udf4|udf5||||||SALT
     */

    const hashString = [
      merchantKey,
      txnid,
      amount,
      productinfo,
      firstname,
      email,
      udf1,
      udf2,
      udf3,
      udf4,
      udf5,
      "",
      "",
      "",
      "",
      "",
      merchantSalt,
    ].join("|");

    console.log(
      "Generating PayU hash:",
      {
        paymentType,
        txnid,
        amount,
        productinfo,
        udf1,
        udf2,
        udf3,
      }
    );

    const hash =
      await sha512(
        hashString
      );

    /*
     * =========================================================
     * RETURN PAYU DATA
     * =========================================================
     */

    return jsonResponse(
      {
        success: true,

        payment_type:
          paymentType,

        key:
          merchantKey,

        txnid,

        amount,

        productinfo,

        firstname,

        email,

        phone,

        hash,

        /*
         * PayU will POST payment response
         * to this callback.
         */
        surl:
          webhookUrl,

        furl:
          webhookUrl,

        curl:
          webhookUrl,

        /*
         * UDF values are returned to frontend
         * so frontend can send them to PayU.
         */
        udf1,

        udf2,

        udf3,

        udf4,

        udf5,

        /*
         * IMPORTANT:
         * These are real URLs, NOT Markdown.
         */
        payu_url:
          payuUrl,

        test_mode:
          isTest,
      },
      200
    );
  } catch (error) {
    console.error(
      "payu-create-payment fatal error:",
      error
    );

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal server error.",

        details:
          error instanceof Error
            ? error.stack || ""
            : "",
      },
      500
    );
  }
});