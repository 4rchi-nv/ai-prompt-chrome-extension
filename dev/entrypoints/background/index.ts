import type { MessageFromUI, MessageToUI } from '../../../src/shared/messaging';
import { defineBackground } from 'wxt/utils/define-background';

export default defineBackground(() => {
  chrome.action.onClicked.addListener(async (tab) => {
    try {
      const { ui_mode } = await chrome.storage.local.get('ui_mode');
      if (ui_mode === 'sidepanel' && tab?.id != null) {
        chrome.sidePanel.open({ tabId: tab.id });
      }
    } catch {
      // ignore
    }
  });

  chrome.runtime.onMessage.addListener((msg: MessageFromUI, _sender, sendResponse) => {
    try {
      if (!msg || typeof msg.type !== 'string') return;

      const respond = (payload: MessageToUI) => sendResponse(payload);

      switch (msg.type) {
        case 'SET_UI_MODE': {
          const setMsg = msg as Extract<MessageFromUI, { type: 'SET_UI_MODE' }>;
          void chrome.storage.local.set({ ui_mode: setMsg.payload.mode });
          if (typeof chrome.action.setPopup === 'function') {
            chrome.action.setPopup({ popup: setMsg.payload.mode === 'popup' ? 'popup.html' : '' });
          }
          respond({ type: 'ACK', requestId: setMsg.requestId });
          break;
        }
        default:
          break;
      }
    } catch {
      // ignore
    }

    return true;
  });
});

