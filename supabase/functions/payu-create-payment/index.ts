import { createClient } from "npm:@supabase/supabase-js@2.58.0";

// --------------------------------------------------
// CORS
// --------------------------------------------------
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Max-Age": "86400",
};

// --------------------------------------------------
// JSON RESPONSE HELPER
// --------------------------------------------------
function jsonResponse(
  data: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

// --------------------------------------------------
// EDGE FUNCTION
// --------------------------------------------------
Deno.serve(async (req: Request) => {
  // ------------------------------------------------
  // CORS PREFLIGHT
  // ------------------------------------------------
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  // ------------------------------------------------
  // ONLY POST ALLOWED
  // ------------------------------------------------
  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed",
      },
      405,
    );
  }

  try {
    // ==================================================
    // 1. GET SUPABASE ENVIRONMENT VARIABLES
    // ==================================================
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );

    if (!supabaseUrl) {
      console.error("SUPABASE_URL is missing");

      return jsonResponse(
        {
          error: "Supabase URL is not configured",
        },
        500,
      );
    }

    if (!supabaseAnonKey) {
      console.error("SUPABASE_ANON_KEY is missing");

      return jsonResponse(
        {
          error: "Supabase anon key is not configured",
        },
        500,
      );
    }

    if (!supabaseServiceKey) {
      console.error("SUPABASE_SERVICE_ROLE_KEY is missing");

      return jsonResponse(
        {
          error: "Supabase service key is not configured",
        },
        500,
      );
    }

    // ==================================================
    // 2. GET AUTHORIZATION HEADER
    // ==================================================
    const authHeader =
      req.headers.get("Authorization") || "";

    if (!authHeader) {
      return jsonResponse(
        {
          error: "Authorization header is required",
        },
        401,
      );
    }

    if (!authHeader.startsWith("Bearer ")) {
      return jsonResponse(
        {
          error: "Invalid authorization header",
        },
        401,
      );
    }

    const token = authHeader
      .replace(/^Bearer\s+/i, "")
      .trim();

    if (!token) {
      return jsonResponse(
        {
          error: "Invalid authentication token",
        },
        401,
      );
    }

    // ==================================================
    // 3. USER SUPABASE CLIENT
    // ==================================================
    const userClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      },
    );

    // ==================================================
    // 4. SERVICE ROLE CLIENT
    // ==================================================
    const serviceClient = createClient(
      supabaseUrl,
      supabaseServiceKey,
    );

    // ==================================================
    // 5. VERIFY LOGGED-IN USER
    // ==================================================
    const {
      data: userData,
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !userData?.user) {
      console.error(
        "User authentication failed:",
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

    // ==================================================
    // 6. READ REQUEST BODY
    // ==================================================
    let body: {
      courseId?: string;
    };

    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        {
          error: "Invalid JSON request body",
        },
        400,
      );
    }

    const courseId = body?.courseId;

    if (!courseId || typeof courseId !== "string") {
      return jsonResponse(
        {
          error: "Course ID required",
        },
        400,
      );
    }

    // ==================================================
    // 7. CREATE PAYMENT TRANSACTION
    // ==================================================
    const {
      data: txnData,
      error: txnError,
    } = await userClient.rpc(
      "create_payment_transaction",
      {
        p_course_id: courseId,
      },
    );

    if (txnError) {
      console.error(
        "create_payment_transaction error:",
        txnError.message,
      );

      return jsonResponse(
        {
          error: txnError.message,
        },
        400,
      );
    }

    if (!txnData) {
      return jsonResponse(
        {
          error: "Payment transaction was not created",
        },
        400,
      );
    }

    // ==================================================
    // 8. NORMALIZE RPC RESPONSE
    // ==================================================
    // Depending on how the RPC function is defined,
    // Supabase may return an object or an array.
    const txn = Array.isArray(txnData)
      ? txnData[0]
      : txnData;

    if (!txn) {
      return jsonResponse(
        {
          error: "Invalid transaction response",
        },
        400,
      );
    }

    if (!txn.txnid) {
      console.error(
        "Transaction response missing txnid:",
        txn,
      );

      return jsonResponse(
        {
          error: "Transaction ID was not generated",
        },
        500,
      );
    }

    if (
      txn.amount === undefined ||
      txn.amount === null
    ) {
      console.error(
        "Transaction response missing amount:",
        txn,
      );

      return jsonResponse(
        {
          error: "Transaction amount was not generated",
        },
        500,
      );
    }

    // ==================================================
    // 9. GET PAYU SETTINGS
    // ==================================================
    const {
      data: settings,
      error: settingsError,
    } = await serviceClient
      .from("payment_settings")
      .select(
        "merchant_key, merchant_salt, test_mode",
      )
      .eq("id", 1)
      .maybeSingle();

    if (settingsError) {
      console.error(
        "Payment settings error:",
        settingsError.message,
      );

      return jsonResponse(
        {
          error:
            "Unable to load payment gateway settings",
        },
        500,
      );
    }

    if (
      !settings ||
      !settings.merchant_key ||
      !settings.merchant_salt
    ) {
      return jsonResponse(
        {
          error:
            "Payment gateway is not configured",
        },
        500,
      );
    }

    // ==================================================
    // 10. GET STUDENT PROFILE
    // ==================================================
    const {
      data: profile,
      error: profileError,
    } = await serviceClient
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "Profile lookup error:",
        profileError.message,
      );
    }

    // ==================================================
    // 11. PREPARE PAYU DATA
    // ==================================================
    const merchantKey = settings.merchant_key;
    const merchantSalt = settings.merchant_salt;
    const isTest = Boolean(settings.test_mode);

    const productinfo =
      txn.course_title ||
      "Course Enrollment";

    const firstname =
      profile?.full_name
        ?.trim()
        ?.split(/\s+/)[0] ||
      "Student";

    const email =
      profile?.email ||
      user.email ||
      "";

    const amount = String(txn.amount);
    const txnid = String(txn.txnid);

    if (!email) {
      return jsonResponse(
        {
          error:
            "Student email is required for payment",
        },
        400,
      );
    }

    // ==================================================
    // 12. PAYU HASH
    // ==================================================
    //
    // PayU request hash format:
    //
    // key|txnid|amount|productinfo|firstname|email
    // |udf1|udf2|udf3|udf4|udf5
    // ||||||||||salt
    //
    // We are not using UDF fields.
    //
    const hashString =
      `${merchantKey}|${txnid}|${amount}|${productinfo}|${firstname}|${email}||||||||||||${merchantSalt}`;

    const hashBuffer =
      await crypto.subtle.digest(
        "SHA-512",
        new TextEncoder().encode(hashString),
      );

    const hash = Array.from(
      new Uint8Array(hashBuffer),
    )
      .map((byte) =>
        byte.toString(16).padStart(2, "0"),
      )
      .join("");

    // ==================================================
    // 13. PAYU PAYMENT URL
    // ==================================================
    const payuBaseUrl = isTest
      ? "https://test.payu.in/_payment"
      : "https://secure.payu.in/_payment";

    // ==================================================
    // 14. CALLBACK URL
    // ==================================================
    const callbackUrl =
      `${supabaseUrl}/functions/v1/payu-webhook`;

    // ==================================================
    // 15. SERVER LOG
    // ==================================================
    // IMPORTANT:
    // Never log merchantSalt or the generated hash.
    console.log("PayU payment initialized:", {
      userId: user.id,
      courseId,
      txnid,
      amount,
      testMode: isTest,
    });

    // ==================================================
    // 16. RETURN PAYMENT DATA
    // ==================================================
    return jsonResponse({
      txnid,
      amount,
      productinfo,
      firstname,
      email,

      // PayU
      key: merchantKey,
      hash,
      payu_url: payuBaseUrl,

      // PayU callbacks
      surl: callbackUrl,
      curl: callbackUrl,

      test_mode: isTest,
    });
  } catch (error) {
    console.error(
      "PayU payment initialization error:",
      error,
    );

    return jsonResponse(
      {
        error: "Payment initialization failed",
        details:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      500,
    );
  }
});