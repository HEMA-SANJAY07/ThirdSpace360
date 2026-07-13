/**
 * @fileoverview Minimal HTTP client for enquiry submissions.
 * No DOM access — accepts a payload, returns parsed JSON or throws.
 */

export class ApiClient {
  /**
   * @param {string} endpoint - The URL to POST to (e.g. '/api/enquiry').
   */
  constructor(endpoint) {
    this.endpoint = endpoint;
  }

  /**
   * Submit a JSON payload via POST.
   *
   * @param {Object} payload - The data to send.
   * @returns {Promise<Object>} Parsed JSON from the server.
   * @throws {Error} If the response is not ok or the network fails.
   */
  async submit(payload) {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Server rejected the submission.');
    }

    return result;
  }
}
