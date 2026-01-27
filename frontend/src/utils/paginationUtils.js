/**
 * Utility function to preserve scroll position during pagination
 * @param {Function} setPage - Function to update page state
 * @param {React.RefObject} scrollPositionRef - Ref to store scroll position
 * @param {number} newPage - New page number to navigate to
 */
export const handlePageChangeWithScrollPreservation = (setPage, scrollPositionRef, newPage) => {
    // Save current scroll position
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
    scrollPositionRef.current = currentScroll;

    // Prevent scroll during state update
    const preventScroll = () => {
        window.scrollTo({
            top: currentScroll,
            behavior: 'auto'
        });
    };

    setPage(newPage);

    // Prevent scroll during render
    requestAnimationFrame(preventScroll);
    setTimeout(preventScroll, 0);
};

/**
 * Restore scroll position after page change
 * @param {React.RefObject} scrollPositionRef - Ref containing saved scroll position
 */
export const restoreScrollPosition = (scrollPositionRef) => {
    if (scrollPositionRef.current > 0) {
        const restoreScroll = () => {
            const originalScrollBehavior = document.documentElement.style.scrollBehavior;
            document.documentElement.style.scrollBehavior = 'auto';
            window.scrollTo(0, scrollPositionRef.current);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        document.documentElement.style.scrollBehavior = originalScrollBehavior;
                    });
                });
            });
        };
        restoreScroll();
        setTimeout(restoreScroll, 0);
    }
};
