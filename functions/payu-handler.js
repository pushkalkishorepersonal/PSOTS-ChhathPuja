/**
 * Cloudflare Pages Function: /payu-handler
 * Receives PayU POST callback (surl/furl) and redirects to the
 * appropriate static page with transaction params as query string.
 *
 * PayU always POSTs to surl/furl — static hosts return 405.
 * This function bridges POST → GET redirect.
 */
export async function onRequestPost({ request }) {
  const formData = await request.formData();

  const status      = formData.get('status')        || '';
  const txnid       = formData.get('txnid')         || '';
  const amount      = formData.get('amount')        || '';
  const firstname   = formData.get('firstname')     || '';
  const email       = formData.get('email')         || '';
  const phone       = formData.get('phone')         || '';
  const productinfo = formData.get('productinfo')   || '';
  const mihpayid    = formData.get('mihpayid')      || '';
  const bankRefNum  = formData.get('bank_ref_num')  || '';
  const errorMsg    = formData.get('error_Message') || formData.get('Error_Message') || '';
  const mode        = formData.get('mode')          || '';

  const qs = new URLSearchParams({
    status,
    txnid,
    amount,
    firstname,
    email,
    phone,
    productinfo,
    mihpayid,
    bank_ref_num: bankRefNum,
    error_Message: errorMsg,
    mode,
  }).toString();

  const isSuccess = status.toLowerCase() === 'success';
  const redirectTo = isSuccess
    ? `/pages/payu-success.html?${qs}`
    : `/pages/payu-failure.html?${qs}`;

  return Response.redirect(new URL(redirectTo, request.url).toString(), 302);
}

// GET requests (e.g. someone opens the URL directly) → send to payment page
export async function onRequestGet({ request }) {
  return Response.redirect(new URL('/pages/payment.html', request.url).toString(), 302);
}
