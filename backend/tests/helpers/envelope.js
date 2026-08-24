/**
 * The response contract these suites were written before.
 *
 * Controllers now go through utils/responseHelper, so every success is
 *   { status: "success", statusCode, message, data }
 * and every handled failure is
 *   { status: "error", statusCode, message }
 * while unhandled ones throw AppError instead of writing a body at all.
 *
 * The assertions used to name the payload directly. These helpers keep them
 * naming the payload -- the data matcher is still exact -- while allowing for
 * the envelope around it. Deliberately NOT a bare `toHaveBeenCalled()`: an
 * assertion that stops checking the payload passes for free, which is worse
 * than the failure it replaced.
 */

/** Success envelope. `data` may be a literal or any jest matcher. */
export const ok = (data) =>
    expect.objectContaining({
        status: "success",
        ...(data === undefined ? {} : { data }),
    });

/** Success envelope, also pinning the message. */
export const okMsg = (message, data) =>
    expect.objectContaining({
        status: "success",
        message,
        ...(data === undefined ? {} : { data }),
    });

/** Error envelope. Pins the message, because "some error" is not a contract. */
export const err = (message) =>
    expect.objectContaining({
        status: "error",
        ...(message === undefined ? {} : { message }),
    });
