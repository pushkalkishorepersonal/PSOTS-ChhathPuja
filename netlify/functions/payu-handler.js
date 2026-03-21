/**
 * Netlify Function: payu-handler
 * Receives PayU POST callback (surl/furl) and redirects to the
 * appropriate static page with transaction params as query string.
 *
 * PayU always POSTs to surl/furl — static HTML hosts return 405.
 * This function bridges POST → GET redirect.
 */
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 302,
      headers: { Location: '/pages/payment.html' },
      body: '',
    };
  }

  // Parse URL-encoded POST body sent by PayU
  const params = new URLSearchParams(event.body || '');

  const status      = params.get('status')        || '';
  const txnid       = params.get('txnid')         || '';
  const amount      = params.get('amount')        || '';
  const firstname   = params.get('firstname')     || '';
  const email       = params.get('email')         || '';
  const phone       = params.get('phone')         || '';
  const productinfo = params.get('productinfo')   || '';
  const mihpayid    = params.get('mihpayid')      || '';
  const bankRefNum  = params.get('bank_ref_num')  || '';
  const errorMsg    = params.get('error_Message') || params.get('Error_Message') || '';
  const mode        = params.get('mode')          || '';

  // Build query string for the static page
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

  return {
    statusCode: 302,
    headers: { Location: redirectTo },
    body: '',
  };
};
