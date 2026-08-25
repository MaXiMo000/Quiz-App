/**
 * A mongoose-like query mock: chainable AND awaitable.
 *
 * Controllers mix both styles against the same model --
 *   await Report.find({...})
 *   await Report.find({...}).sort(...).limit(30).lean()
 * -- so a mock that only resolves, or only chains, breaks one of them. The
 * `then` makes the object itself awaitable; every chain method returns it.
 *
 *   Report.find.mockReturnValue(query(mockReports));
 */
export const query = (result) => {
    const q = {
        sort: jest.fn(() => q),
        limit: jest.fn(() => q),
        skip: jest.fn(() => q),
        select: jest.fn(() => q),
        populate: jest.fn(() => q),
        lean: jest.fn(() => Promise.resolve(result)),
        exec: jest.fn(() => Promise.resolve(result)),
        then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    };
    return q;
};
