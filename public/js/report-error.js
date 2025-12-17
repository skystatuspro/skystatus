/**
 * Report Error Widget for SkyStatus Guide Pages
 * Adds a floating button to report content errors
 * Submits to Supabase feedback table
 */
(function() {
  'use strict';

  // Supabase config (anon key is safe to expose)
  const SUPABASE_URL = 'https://gjpucmnghcopsatonqcy.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqcHVjbW5naGNvcHNhdG9ucWN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzYwNDQsImV4cCI6MjA4MDk1MjA0NH0.4VyQQBNmDOlhzjqLpbiBPi9bpMj6eqaGO8JYuC5bqlo';

  // State
  let isOpen = false;
  let selectedText = '';

  // Get context info
  function getPageContext() {
    const url = window.location.href;
    const title = document.title;
    
    // Find nearest heading to scroll position
    const headings = document.querySelectorAll('h1, h2, h3');
    let nearestHeading = '';
    let minDistance = Infinity;
    const scrollY = window.scrollY + window.innerHeight / 3;
    
    headings.forEach(h => {
      const rect = h.getBoundingClientRect();
      const headingY = rect.top + window.scrollY;
      const distance = Math.abs(scrollY - headingY);
      if (distance < minDistance) {
        minDistance = distance;
        nearestHeading = h.textContent.trim();
      }
    });

    return { url, title, nearestHeading };
  }

  // Capture text selection
  function captureSelection() {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      selectedText = selection.toString().trim().substring(0, 500);
    }
  }

  // Submit to Supabase
  async function submitReport(message) {
    const context = getPageContext();
    
    // Build detailed message with context
    let fullMessage = message;
    fullMessage += '\n\n---\n';
    fullMessage += '📍 Page: ' + context.url + '\n';
    fullMessage += '📑 Section: ' + (context.nearestHeading || 'Top of page') + '\n';
    if (selectedText) {
      fullMessage += '✏️ Selected text: "' + selectedText.substring(0, 200) + '"\n';
    }
    fullMessage += '🕐 Reported: ' + new Date().toISOString();

    const payload = {
      trigger: 'guide_error_report',
      message: fullMessage,
      page: context.url,
      rating: null,
      user_id: null,
      user_email: null
    };

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(payload)
      });

      return response.ok;
    } catch (err) {
      console.error('Error submitting report:', err);
      return false;
    }
  }

  // Create styles
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .report-error-btn {
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #0f172a;
        color: white;
        border: none;
        padding: 12px 16px;
        border-radius: 50px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9998;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      .report-error-btn:hover {
        background: #1e293b;
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0,0,0,0.2);
      }
      .report-error-btn svg {
        width: 18px;
        height: 18px;
      }
      
      .report-error-modal {
        position: fixed;
        bottom: 80px;
        right: 24px;
        width: 340px;
        max-width: calc(100vw - 48px);
        background: white;
        border-radius: 16px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.2);
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        overflow: hidden;
        transform: translateY(10px);
        opacity: 0;
        visibility: hidden;
        transition: all 0.2s ease;
      }
      .report-error-modal.open {
        transform: translateY(0);
        opacity: 1;
        visibility: visible;
      }
      
      .report-error-header {
        background: #0f172a;
        color: white;
        padding: 16px 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .report-error-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      .report-error-close {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 4px;
        opacity: 0.7;
        transition: opacity 0.2s;
      }
      .report-error-close:hover {
        opacity: 1;
      }
      
      .report-error-body {
        padding: 20px;
      }
      .report-error-context {
        background: #f1f5f9;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 16px;
        font-size: 13px;
        color: #475569;
      }
      .report-error-context strong {
        color: #0f172a;
      }
      .report-error-selected {
        background: #fef3c7;
        border-left: 3px solid #f59e0b;
        padding: 8px 12px;
        margin-top: 8px;
        font-style: italic;
        font-size: 12px;
        color: #92400e;
        max-height: 60px;
        overflow: hidden;
      }
      
      .report-error-textarea {
        width: 100%;
        min-height: 100px;
        padding: 12px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        font-size: 14px;
        font-family: inherit;
        resize: vertical;
        margin-bottom: 16px;
      }
      .report-error-textarea:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      
      .report-error-submit {
        width: 100%;
        background: #3b82f6;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
      }
      .report-error-submit:hover {
        background: #2563eb;
      }
      .report-error-submit:disabled {
        background: #94a3b8;
        cursor: not-allowed;
      }
      
      .report-error-success {
        text-align: center;
        padding: 30px 20px;
      }
      .report-error-success svg {
        width: 48px;
        height: 48px;
        color: #10b981;
        margin-bottom: 12px;
      }
      .report-error-success h4 {
        margin: 0 0 8px 0;
        color: #0f172a;
      }
      .report-error-success p {
        margin: 0;
        color: #64748b;
        font-size: 14px;
      }
      
      @media (max-width: 480px) {
        .report-error-btn span {
          display: none;
        }
        .report-error-btn {
          padding: 14px;
          border-radius: 50%;
        }
        .report-error-modal {
          right: 12px;
          left: 12px;
          width: auto;
          bottom: 70px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Create HTML
  function createWidget() {
    // Button
    const btn = document.createElement('button');
    btn.className = 'report-error-btn';
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
      <span>Report error</span>
    `;
    btn.onclick = toggleModal;
    document.body.appendChild(btn);

    // Modal
    const modal = document.createElement('div');
    modal.className = 'report-error-modal';
    modal.id = 'reportErrorModal';
    modal.innerHTML = `
      <div class="report-error-header">
        <h3>Report an error</h3>
        <button class="report-error-close" onclick="window.closeReportError()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="report-error-body">
        <div class="report-error-context" id="reportContext"></div>
        <textarea 
          class="report-error-textarea" 
          id="reportMessage"
          placeholder="What's wrong? Be as specific as possible..."
        ></textarea>
        <button class="report-error-submit" id="reportSubmit" onclick="window.submitReportError()">
          Send Report
        </button>
      </div>
    `;
    document.body.appendChild(modal);
  }

  // Toggle modal
  function toggleModal() {
    captureSelection();
    const modal = document.getElementById('reportErrorModal');
    isOpen = !isOpen;
    
    if (isOpen) {
      const context = getPageContext();
      let contextHTML = `<strong>Section:</strong> ${context.nearestHeading || 'Top of page'}`;
      if (selectedText) {
        contextHTML += `<div class="report-error-selected">"${selectedText.substring(0, 150)}${selectedText.length > 150 ? '...' : ''}"</div>`;
      }
      document.getElementById('reportContext').innerHTML = contextHTML;
      modal.classList.add('open');
      document.getElementById('reportMessage').focus();
    } else {
      modal.classList.remove('open');
    }
  }

  // Close modal
  window.closeReportError = function() {
    const modal = document.getElementById('reportErrorModal');
    modal.classList.remove('open');
    isOpen = false;
  };

  // Submit report
  window.submitReportError = async function() {
    const message = document.getElementById('reportMessage').value.trim();
    if (!message) return;

    const submitBtn = document.getElementById('reportSubmit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    const success = await submitReport(message);

    if (success) {
      document.querySelector('.report-error-body').innerHTML = `
        <div class="report-error-success">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <h4>Thanks for reporting!</h4>
          <p>We'll review this and fix any errors.</p>
        </div>
      `;
      setTimeout(() => {
        window.closeReportError();
        // Reset modal for next use
        setTimeout(() => {
          document.querySelector('.report-error-body').innerHTML = `
            <div class="report-error-context" id="reportContext"></div>
            <textarea class="report-error-textarea" id="reportMessage" placeholder="What's wrong? Be as specific as possible..."></textarea>
            <button class="report-error-submit" id="reportSubmit" onclick="window.submitReportError()">Send Report</button>
          `;
        }, 300);
      }, 2000);
    } else {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Error - Try again';
    }
  };

  // Initialize
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setup);
    } else {
      setup();
    }
  }

  function setup() {
    injectStyles();
    createWidget();
  }

  init();
})();
