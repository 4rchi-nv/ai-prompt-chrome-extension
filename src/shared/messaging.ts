export type MessageFromUI =
  | {
      type: 'SET_UI_MODE';
      requestId: string;
      payload: {
        mode: 'popup' | 'sidepanel';
      };
    }
  | { type: string; requestId?: string; payload?: unknown };

export type MessageToUI =
  | {
      type: 'ACK';
      requestId: string;
    }
  | {
      type: 'ERROR';
      requestId: string;
      message: string;
    };

