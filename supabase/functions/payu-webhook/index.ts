import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase environment variables");

      return new Response(
        JSON.stringify({
          error: "Server configuration error",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    // PayU sends POST
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          error: "Method not allowed",
        }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    // Read PayU response
    const formData = await req.formData();

    const data: Record<string, string> = {};

    for (const [key, value] of formData.entries()) {
      data[key] = String(value);
    }

    console.log("PayU webhook received:", {
      status: data.status,
      txnid: data.txnid,
      mihpayid: data.mihpayid,
      amount: data.amount,
      unmappedstatus: data.unmappedstatus,
    });

    const status = data.status || "";
    const txnid = data.txnid || "";
    const mihpayid = data.mihpayid || "";
    const amount = data.amount || "";

    if (!txnid) {
      console.error("Missing transaction ID");

      return new Response(
        JSON.stringify({
          error: "Transaction ID missing",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
    );

    /*
     * Find transaction.
     *
     * IMPORTANT:
     * This assumes your payment transaction table contains
     * a `txnid` column.
     */
    const { data: transaction, error: transactionError } =
      await supabaseAdmin
        .from("payment_transactions")
        .select("*")
        .eq("txnid", txnid)
        .maybeSingle();

    if (transactionError) {
      console.error(
        "Transaction lookup error:",
        transactionError,
      );

      return new Response(
        JSON.stringify({
          error: "Transaction lookup failed",
          details: transactionError.message,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    if (!transaction) {
      console.error("Transaction not found:", txnid);

      /*
       * We still return 200 so PayU does not continuously retry
       * a transaction that our database cannot find.
       */
      return new Response(
        JSON.stringify({
          success: false,
          message: "Transaction not found",
          txnid,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    /*
     * SUCCESS
     */
    if (status.toLowerCase() === "success") {
      const { error: updateError } = await supabaseAdmin
        .from("payment_transactions")
        .update({
          status: "success",
          mihpayid: mihpayid || null,
          payment_response: data,
          updated_at: new Date().toISOString(),
        })
        .eq("txnid", txnid);

      if (updateError) {
        console.error(
          "Success update failed:",
          updateError,
        );

        return new Response(
          JSON.stringify({
            error: "Failed to update transaction",
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          },
        );
      }

      /*
       * Redirect student back to website.
       */
      const redirectUrl =
        `https://learnpathshala.vercel.app/dashboard/student/courses` +
        `?payment=success&txnid=${encodeURIComponent(txnid)}`;

      return new Response(null, {
        status: 303,
        headers: {
          ...corsHeaders,
          Location: redirectUrl,
        },
      });
    }

    /*
     * FAILURE / CANCELLED / OTHER
     */
    const finalStatus =
      status.toLowerCase() === "failure"
        ? "failed"
        : status.toLowerCase() === "cancel"
          ? "cancelled"
          : "failed";

    const { error: updateError } = await supabaseAdmin
      .from("payment_transactions")
      .update({
        status: finalStatus,
        mihpayid: mihpayid || null,
        payment_response: data,
        updated_at: new Date().toISOString(),
      })
      .eq("txnid", txnid);

    if (updateError) {
      console.error(
        "Failure update failed:",
        updateError,
      );

      return new Response(
        JSON.stringify({
          error: "Failed to update transaction",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        },
      );
    }

    const redirectUrl =
      `https://learnpathshala.vercel.app/dashboard/student/courses` +
      `?payment=failed&txnid=${encodeURIComponent(txnid)}`;

    return new Response(null, {
      status: 303,
      headers: {
        ...corsHeaders,
        Location: redirectUrl,
      },
    });
  } catch (error) {
    console.error("Webhook error:", error);

    return new Response(
      JSON.stringify({
        error: "Webhook processing failed",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});