/**
 * Utility functions for exporting quiz reports and data
 */

/**
 * Export quiz report as PDF (using browser print functionality)
 * @param {Object} report - The quiz report object
 * @param {string} report.quizName - Name of the quiz
 * @param {number} report.score - User's score
 * @param {number} report.total - Total possible score
 * @param {Array} report.questions - Array of question objects
 * @param {Date} report.createdAt - Date when report was created
 */
export const exportReportAsPDF = (report) => {
    const printWindow = window.open('', '_blank');
    const percentage = Math.round((report.score / report.total) * 100);
    const passed = report.score >= report.total * 0.5;

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Quiz Report - ${report.quizName}</title>
            <style>
                @media print {
                    @page {
                        margin: 1cm;
                        size: A4;
                    }
                }
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    padding: 20px;
                    color: #333;
                    line-height: 1.6;
                }
                .header {
                    border-bottom: 3px solid #6366f1;
                    padding-bottom: 20px;
                    margin-bottom: 30px;
                }
                .header h1 {
                    color: #6366f1;
                    margin: 0;
                    font-size: 28px;
                }
                .header p {
                    margin: 5px 0;
                    color: #666;
                }
                .summary {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 30px;
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 20px;
                }
                .summary-item {
                    text-align: center;
                }
                .summary-item h3 {
                    margin: 0;
                    font-size: 14px;
                    color: #666;
                    text-transform: uppercase;
                }
                .summary-item .value {
                    font-size: 32px;
                    font-weight: bold;
                    color: #6366f1;
                    margin: 10px 0;
                }
                .status {
                    display: inline-block;
                    padding: 8px 16px;
                    border-radius: 20px;
                    font-weight: bold;
                    font-size: 14px;
                }
                .status.passed {
                    background: #10b981;
                    color: white;
                }
                .status.failed {
                    background: #ef4444;
                    color: white;
                }
                .questions-section {
                    margin-top: 30px;
                }
                .question-item {
                    margin-bottom: 25px;
                    padding: 15px;
                    border-left: 4px solid #e5e7eb;
                    page-break-inside: avoid;
                }
                .question-item.correct {
                    border-left-color: #10b981;
                    background: #f0fdf4;
                }
                .question-item.incorrect {
                    border-left-color: #ef4444;
                    background: #fef2f2;
                }
                .question-number {
                    font-weight: bold;
                    color: #6366f1;
                    margin-bottom: 10px;
                }
                .question-text {
                    font-size: 16px;
                    margin-bottom: 15px;
                    font-weight: 500;
                }
                .answer-section {
                    margin-top: 10px;
                }
                .answer-row {
                    margin: 8px 0;
                    padding: 8px;
                    border-radius: 4px;
                }
                .answer-row.user-answer {
                    background: #dbeafe;
                    border-left: 3px solid #3b82f6;
                }
                .answer-row.correct-answer {
                    background: #d1fae5;
                    border-left: 3px solid #10b981;
                }
                .answer-label {
                    font-weight: bold;
                    margin-right: 10px;
                }
                .footer {
                    margin-top: 40px;
                    padding-top: 20px;
                    border-top: 2px solid #e5e7eb;
                    text-align: center;
                    color: #666;
                    font-size: 12px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📊 Quiz Report</h1>
                <p><strong>Quiz:</strong> ${report.quizName}</p>
                <p><strong>Date:</strong> ${new Date(report.createdAt || report.updatedAt).toLocaleString()}</p>
            </div>

            <div class="summary">
                <div class="summary-item">
                    <h3>Score</h3>
                    <div class="value">${report.score}/${report.total}</div>
                </div>
                <div class="summary-item">
                    <h3>Percentage</h3>
                    <div class="value">${percentage}%</div>
                </div>
                <div class="summary-item">
                    <h3>Status</h3>
                    <span class="status ${passed ? 'passed' : 'failed'}">
                        ${passed ? '✅ Passed' : '❌ Failed'}
                    </span>
                </div>
            </div>

            <div class="questions-section">
                <h2>Question Review</h2>
                ${report.questions.map((q, idx) => {
                    const isCorrect = q.userAnswer === q.correctAnswer;
                    return `
                        <div class="question-item ${isCorrect ? 'correct' : 'incorrect'}">
                            <div class="question-number">Question ${idx + 1}</div>
                            <div class="question-text">${q.questionText}</div>
                            <div class="answer-section">
                                <div class="answer-row user-answer">
                                    <span class="answer-label">Your Answer:</span>
                                    ${q.userAnswerText || q.userAnswer}
                                    ${!isCorrect ? '<span style="color: #ef4444; margin-left: 10px;">❌</span>' : '<span style="color: #10b981; margin-left: 10px;">✅</span>'}
                                </div>
                                ${!isCorrect ? `
                                    <div class="answer-row correct-answer">
                                        <span class="answer-label">Correct Answer:</span>
                                        ${q.correctAnswerText || q.correctAnswer}
                                        <span style="color: #10b981; margin-left: 10px;">✅</span>
                                    </div>
                                ` : ''}
                                <div style="margin-top: 8px; font-size: 12px; color: #666;">
                                    Time taken: ${Math.round(q.answerTime)}s
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <div class="footer">
                <p>Generated by QuizNest - Smart Quiz Platform</p>
                <p>Report ID: ${report._id}</p>
            </div>
        </body>
        </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
    }, 250);
};

/**
 * Export quiz report as CSV
 * @param {Object} report - The quiz report object
 */
export const exportReportAsCSV = (report) => {
    if (!report || !report.quizName) {
        throw new Error('Invalid report data');
    }

    const score = report.score || 0;
    const total = report.total || 0;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
    const passed = score >= total * 0.5;

    let csv = `Quiz Report: ${report.quizName}\n`;
    csv += `Date: ${new Date(report.createdAt || report.updatedAt || Date.now()).toLocaleString()}\n`;
    csv += `Score: ${score}/${total} (${percentage}%)\n`;
    csv += `Status: ${passed ? 'Passed' : 'Failed'}\n\n`;

    csv += `Question Number,Question Text,Your Answer,Correct Answer,Time (seconds),Result\n`;

    if (report.questions && Array.isArray(report.questions)) {
        report.questions.forEach((q, idx) => {
            if (!q) return; // Skip invalid questions
            const isCorrect = q.userAnswer === q.correctAnswer;
            const questionText = String(q.questionText || '').replace(/"/g, '""');
            const userAnswer = String(q.userAnswerText || q.userAnswer || '').replace(/"/g, '""');
            const correctAnswer = String(q.correctAnswerText || q.correctAnswer || '').replace(/"/g, '""');
            const answerTime = q.answerTime ? Math.round(q.answerTime) : 0;

            csv += `${idx + 1},"${questionText}","${userAnswer}","${correctAnswer}",${answerTime},${isCorrect ? 'Correct' : 'Incorrect'}\n`;
        });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `quiz-report-${String(report.quizName).replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the object URL after a delay
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 100);
};

/**
 * Export all reports summary as CSV
 * @param {Array} reports - Array of report objects
 */
export const exportReportsSummaryAsCSV = (reports) => {
    if (!reports || !Array.isArray(reports) || reports.length === 0) {
        throw new Error('No reports to export');
    }

    let csv = `Quiz Reports Summary\n`;
    csv += `Generated: ${new Date().toLocaleString()}\n`;
    csv += `Total Reports: ${reports.length}\n\n`;

    csv += `Quiz Name,Score,Total,Percentage,Status,Date\n`;

    reports.forEach(report => {
        if (!report || !report.quizName) return; // Skip invalid reports

        const score = report.score || 0;
        const total = report.total || 0;
        const percentage = total > 0 ? Math.round((score / total) * 100) : 0;
        const passed = score >= total * 0.5;
        const date = report.createdAt || report.updatedAt
            ? new Date(report.createdAt || report.updatedAt).toLocaleDateString()
            : 'N/A';

        csv += `"${String(report.quizName).replace(/"/g, '""')}",${score},${total},${percentage}%,${passed ? 'Passed' : 'Failed'},${date}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `quiz-reports-summary-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the object URL after a delay
    setTimeout(() => {
        URL.revokeObjectURL(url);
    }, 100);
};
