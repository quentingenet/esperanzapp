import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import { useToastStore } from "@/store/toastStore";

export function AppToast() {
  const { open, message, severity, hide } = useToastStore();
  return (
    <Snackbar
      open={open}
      autoHideDuration={3000}
      onClose={hide}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      sx={{ bottom: "calc(80px + max(env(safe-area-inset-bottom), 28px) + 8px)" }}
    >
      <Alert onClose={hide} severity={severity} variant="filled" sx={{ width: "100%" }}>
        {message}
      </Alert>
    </Snackbar>
  );
}
