export interface UpdateAlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
}

export interface UpdateAlertOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
}

/** Serializes update alerts and always releases its lock if presentation fails. */
export function createUpdateAlertGate(
  present: (
    title: string,
    message: string,
    buttons: UpdateAlertButton[],
    options: UpdateAlertOptions
  ) => void
) {
  let visible = false;

  return {
    show(
      title: string,
      message: string,
      buttons: UpdateAlertButton[] = [{ text: 'OK' }],
      options: UpdateAlertOptions = {}
    ): boolean {
      if (visible) return false;
      visible = true;

      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        visible = false;
      };

      try {
        present(
          title,
          message,
          buttons.map((button) => ({
            ...button,
            onPress: () => {
              release();
              void button.onPress?.();
            },
          })),
          { ...options, onDismiss: release }
        );
        return true;
      } catch {
        release();
        return false;
      }
    },
  };
}
