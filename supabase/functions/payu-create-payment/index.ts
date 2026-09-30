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
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

async function sha512(value: string) {
  const data = new TextEncoder().encode(value);

  const hashBuffer = await crypto.subtle.digest(
    "SHA-512",
    data,
  );

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) =>
      byte.toString(16).padStart(2, "0"),
    )
    .join("");
}

function generateTransactionId(prefix: string) {
  return `${prefix}${crypto.randomUUID()
    .replace(/-/g, "")
    .substring(0, 23)}`;
}

Deno.serve(async (req: Request) => {
  // =====================================================
  // CORS
  // =====================================================

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
      405,
    );
  }

  try {
    console.log(
      "========== PAYU CREATE PAYMENT ==========",
    );

    // ===================================================
    // ENVIRONMENT
    // ===================================================

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
      );

    const anonKey =
      Deno.env.get(
        "SUPABASE_ANON_KEY",
      );

    if (!supabaseUrl) {
      return jsonResponse(
        {
          error:
            "SUPABASE_URL is not configured",
        },
        500,
      );
    }

    if (!serviceRoleKey) {
      return jsonResponse(
        {
          error:
            "SUPABASE_SERVICE_ROLE_KEY is not configured",
        },
        500,
      );
    }

    if (!anonKey) {
      return jsonResponse(
        {
          error:
            "SUPABASE_ANON_KEY is not configured",
        },
        500,
      );
    }

    // ===================================================
    // AUTHORIZATION
    // ===================================================

    const authHeader =
      req.headers.get("Authorization") || "";

    if (!authHeader) {
      return jsonResponse(
        {
          error: "Unauthorized",
        },
        401,
      );
    }

    const token =
      authHeader
        .replace(/^Bearer\s+/i, "")
        .trim();

    if (!token) {
      return jsonResponse(
        {
          error:
            "Authorization token missing",
        },
        401,
      );
    }

    // ===================================================
    // USER CLIENT
    // ===================================================

    const userClient = createClient(
      supabaseUrl,
      anonKey,
      {
        global: {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        },
      },
    );

    // ===================================================
    // SERVICE CLIENT
    // ===================================================

    const serviceClient = createClient(
      supabaseUrl,
      serviceRoleKey,
    );

    // ===================================================
    // VERIFY USER
    // ===================================================

    const {
      data: userData,
      error: userError,
    } =
      await userClient.auth.getUser();

    if (
      userError ||
      !userData?.user
    ) {
      console.error(
        "User verification failed:",
        userError?.message,
      );

      return jsonResponse(
        {
          error: "Unauthorized",
        },
        401,
      );
    }

    const user = userData.user;

    console.log(
      "Authenticated user:",
      user.id,
    );

    // ===================================================
    // REQUEST BODY
    // ===================================================

    let body: any;

    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        {
          error:
            "Invalid JSON request body",
        },
        400,
      );
    }

    const courseId =
      body?.courseId || null;

    const mockTestId =
      body?.mockTestId || null;

    // ===================================================
    // MUST PROVIDE ONE PAYMENT TYPE
    // ===================================================

    if (!courseId && !mockTestId) {
      return jsonResponse(
        {
          error:
            "courseId or mockTestId is required",
        },
        400,
      );
    }

    if (courseId && mockTestId) {
      return jsonResponse(
        {
          error:
            "Send either courseId or mockTestId, not both",
        },
        400,
      );
    }

    const isMockTestPayment =
      Boolean(mockTestId);

    console.log(
      "Payment type:",
      isMockTestPayment
        ? "MOCK_TEST"
        : "COURSE",
    );

    // ===================================================
    // GET PAYMENT SETTINGS
    // ===================================================

    const {
      data: settings,
      error: settingsError,
    } =
      await serviceClient
        .from("payment_settings")
        .select(
          "merchant_key, merchant_salt, test_mode",
        )
        .eq("id", 1)
        .maybeSingle();

    if (settingsError) {
      console.error(
        "Payment settings error:",
        settingsError,
      );

      return jsonResponse(
        {
          error:
            "Could not load payment gateway settings",
        },
        500,
      );
    }

    if (!settings) {
      return jsonResponse(
        {
          error:
            "Payment gateway is not configured",
        },
        500,
      );
    }

    if (!settings.merchant_key) {
      return jsonResponse(
        {
          error:
            "PayU merchant key is missing",
        },
        500,
      );
    }

    if (!settings.merchant_salt) {
      return jsonResponse(
        {
          error:
            "PayU merchant salt is missing",
        },
        500,
      );
    }

    const merchantKey =
      String(
        settings.merchant_key,
      ).trim();

    const merchantSalt =
      String(
        settings.merchant_salt,
      ).trim();

    const isTest =
      Boolean(settings.test_mode);

    // ===================================================
    // GET STUDENT PROFILE
    // ===================================================

    const {
      data: profile,
      error: profileError,
    } =
      await serviceClient
        .from("profiles")
        .select(
          "full_name, email",
        )
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error(
        "Profile error:",
        profileError,
      );
    }

    // ===================================================
    // COMMON CUSTOMER DATA
    // ===================================================

    const fullName =
      String(
        profile?.full_name ||
          user.user_metadata?.full_name ||
          "Student",
      ).trim();

    const firstname =
      fullName
        .split(/\s+/)[0]
        .substring(0, 60) ||
      "Student";

    const email =
      String(
        profile?.email ||
          user.email ||
          "",
      ).trim();

    const phone =
      String(
        user.user_metadata?.phone ||
          user.user_metadata?.mobile ||
          "",
      ).trim();

    if (!email) {
      return jsonResponse(
        {
          error:
            "Student email is required for payment",
        },
        400,
      );
    }

    // ===================================================
    // PAYMENT VARIABLES
    // ===================================================

    let productinfo = "";
    let amount = "";
    let txnid = "";

    // UDF values
    let udf1 = "";
    let udf2 = "";
    let udf3 = "";
    let udf4 = "";
    let udf5 = "";

    // ===================================================
    // COURSE PAYMENT
    // ===================================================

    if (courseId) {
      console.log(
        "Course ID:",
        courseId,
      );

      const {
        data: txnData,
        error: txnError,
      } =
        await userClient.rpc(
          "create_payment_transaction",
          {
            p_course_id: courseId,
          },
        );

      if (txnError) {
        console.error(
          "create_payment_transaction error:",
          txnError,
        );

        return jsonResponse(
          {
            error:
              txnError.message ||
              "Could not create payment transaction",
          },
          400,
        );
      }

      console.log(
        "Raw course transaction data:",
        txnData,
      );

      const txn =
        Array.isArray(txnData)
          ? txnData[0]
          : txnData;

      if (!txn) {
        return jsonResponse(
          {
            error:
              "Payment transaction was not created",
          },
          500,
        );
      }

      console.log(
        "Course transaction:",
        txn,
      );

      productinfo =
        String(
          txn.course_title ||
            txn.title ||
            "Course Enrollment",
        ).trim();

      const amountNumber =
        Number(txn.amount);

      if (
        !Number.isFinite(
          amountNumber,
        ) ||
        amountNumber <= 0
      ) {
        return jsonResponse(
          {
            error:
              "Invalid payment amount",
          },
          400,
        );
      }

      amount =
        amountNumber.toFixed(2);

      txnid =
        String(
          txn.txnid ||
            txn.transaction_id ||
            "",
        ).trim();

      if (!txnid) {
        return jsonResponse(
          {
            error:
              "Transaction ID was not generated",
          },
          500,
        );
      }

      /*
       * Course payment UDF.
       *
       * Existing course payment continues
       * to work normally.
       */
      udf1 = courseId;
      udf2 = user.id;
      udf3 = "course";
    }

    // ===================================================
    // MOCK TEST PAYMENT
    // ===================================================

    if (mockTestId) {
      console.log(
        "Mock Test ID:",
        mockTestId,
      );

      // -----------------------------------------------
      // GET MOCK TEST
      // -----------------------------------------------

      const {
        data: mockTest,
        error: mockTestError,
      } =
        await serviceClient
          .from("mock_tests")
          .select(
            "id, title, price, is_free, status",
          )
          .eq("id", mockTestId)
          .maybeSingle();

      if (mockTestError) {
        console.error(
          "Mock test fetch error:",
          mockTestError,
        );

        return jsonResponse(
          {
            error:
              "Could not load mock test",
          },
          500,
        );
      }

      if (!mockTest) {
        return jsonResponse(
          {
            error:
              "Mock test not found",
          },
          404,
        );
      }

      if (
        mockTest.status !==
        "published"
      ) {
        return jsonResponse(
          {
            error:
              "This mock test is not available",
          },
          400,
        );
      }

      if (mockTest.is_free) {
        return jsonResponse(
          {
            error:
              "This mock test is free",
          },
          400,
        );
      }

      // -----------------------------------------------
      // PRICE
      // -----------------------------------------------

      const mockTestAmount =
        Number(mockTest.price);

      if (
        !Number.isFinite(
          mockTestAmount,
        ) ||
        mockTestAmount <= 0
      ) {
        return jsonResponse(
          {
            error:
              "Invalid mock test price",
          },
          400,
        );
      }

      amount =
        mockTestAmount.toFixed(2);

      productinfo =
        String(
          mockTest.title ||
            "Mock Test",
        ).trim();

      // -----------------------------------------------
      // CHECK EXISTING SUCCESS PURCHASE
      // -----------------------------------------------

      const {
        data: existingPurchase,
        error:
          existingPurchaseError,
      } =
        await serviceClient
          .from(
            "mock_test_purchases",
          )
          .select(
            "id, payment_status",
          )
          .eq(
            "test_id",
            mockTestId,
          )
          .eq(
            "student_id",
            user.id,
          )
          .eq(
            "payment_status",
            "success",
          )
          .maybeSingle();

      if (
        existingPurchaseError
      ) {
        console.error(
          "Existing purchase check error:",
          existingPurchaseError,
        );
      }

      if (existingPurchase) {
        return jsonResponse(
          {
            error:
              "You have already purchased this mock test",
          },
          400,
        );
      }

      // -----------------------------------------------
      // CREATE UNIQUE PAYU TRANSACTION ID
      // -----------------------------------------------

      txnid =
        generateTransactionId(
          "MT",
        );

      if (txnid.length > 25) {
        txnid =
          txnid.substring(0, 25);
      }

      /*
       * IMPORTANT:
       *
       * UDF1 = Mock Test ID
       * UDF2 = Student ID
       * UDF3 = Payment Type
       *
       * PayU sends these values back to webhook.
       */
      udf1 = mockTestId;
      udf2 = user.id;
      udf3 = "mock_test";

      // -----------------------------------------------
      // CREATE PENDING PURCHASE
      // -----------------------------------------------

      const {
        error: pendingPurchaseError,
      } =
        await serviceClient
          .from(
            "mock_test_purchases",
          )
          .insert({
            test_id: mockTestId,
            student_id: user.id,
            payment_status: "pending",
          });

      if (
        pendingPurchaseError
      ) {
        console.error(
          "Pending mock test purchase error:",
          pendingPurchaseError,
        );

        return jsonResponse(
          {
            error:
              "Could not create mock test payment record",
            details:
              pendingPurchaseError.message,
          },
          500,
        );
      }

      console.log(
        "Pending mock test purchase created",
        {
          testId: mockTestId,
          studentId: user.id,
          txnid,
        },
      );
    }

    // ===================================================
    // VALIDATE TRANSACTION ID
    // ===================================================

    if (!txnid) {
      return jsonResponse(
        {
          error:
            "Transaction ID is missing",
        },
        500,
      );
    }

    if (txnid.length > 25) {
      return jsonResponse(
        {
          error:
            "Transaction ID is too long",
        },
        500,
      );
    }

    // ===================================================
    // PAYU CALLBACK
    // ===================================================

    const callbackUrl =
      `${supabaseUrl}/functions/v1/payu-webhook`;

    // ===================================================
    // PAYU HASH
    //
    // Standard hosted checkout:
    //
    // key|txnid|amount|productinfo|firstname|email|
    // udf1|udf2|udf3|udf4|udf5||||||SALT
    //
    // ===================================================

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
        txnid,
        amount,
        productinfo,
        paymentType:
          isMockTestPayment
            ? "mock_test"
            : "course",
      },
    );

    const hash =
      await sha512(
        hashString,
      );

    // ===================================================
    // PAYU URL
    // ===================================================

    const payuUrl =
      isTest
        ? "https://test.payu.in/_payment"
        : "https://secure.payu.in/_payment";

    // ===================================================
    // FINAL RESPONSE
    // ===================================================

    const responseData = {
      txnid,
      amount,
      productinfo,
      firstname,
      email,

      key: merchantKey,

      hash,

      payu_url: payuUrl,

      surl: callbackUrl,
      curl: callbackUrl,
      furl: callbackUrl,

      phone,

      udf1,
      udf2,
      udf3,
      udf4,
      udf5,

      test_mode: isTest,

      payment_type:
        isMockTestPayment
          ? "mock_test"
          : "course",
    };

    console.log(
      "PayU payment initialized successfully:",
      {
        txnid,
        amount,
        productinfo,
        paymentType:
          isMockTestPayment
            ? "mock_test"
            : "course",
        payuUrl,
        testMode: isTest,
      },
    );

    return jsonResponse(
      responseData,
      200,
    );
  } catch (error) {
    console.error(
      "========== PAYU PAYMENT ERROR ==========",
    );

    console.error(error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Payment initialization failed",
      },
      500,
    );
  }
});