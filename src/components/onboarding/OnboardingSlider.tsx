import { useState, useRef } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MobileStepper from "@mui/material/MobileStepper";
import Typography from "@mui/material/Typography";
import { useTranslation } from "react-i18next";
import { SlideHabit, SlideProgress, SlideRelapse, SlideStats } from "./slides";
import type { OnboardingSliderProps } from "@/types";

const SLIDE_COUNT = 4;

const PULSE = {
  "@keyframes swipe-hint": {
    "0%, 100%": { opacity: 0.15, transform: "translateX(0)" },
    "50%": { opacity: 0.9, transform: "translateX(5px)" },
  },
  animation: "swipe-hint 1.3s ease-in-out infinite",
} as const;

const PULSE_LEFT = {
  "@keyframes swipe-hint-left": {
    "0%, 100%": { opacity: 0.15, transform: "translateX(0)" },
    "50%": { opacity: 0.9, transform: "translateX(-5px)" },
  },
  animation: "swipe-hint-left 1.3s ease-in-out infinite",
} as const;

const SLIDES = [SlideHabit, SlideProgress, SlideRelapse, SlideStats];

export function OnboardingSlider({ onComplete, onSkip }: OnboardingSliderProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const startX = useRef(0);
  const isLast = step === SLIDE_COUNT - 1;
  const Slide = SLIDES[step];

  const handleNext = () => (isLast ? onComplete() : setStep((s) => s + 1));
  const handlePrev = () => { if (step > 0) setStep((s) => s - 1); };

  return (
    <Box sx={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end", pt: "calc(env(safe-area-inset-top) + 8px)", px: 2, pb: 0 }}>
        <Button onClick={onSkip} aria-label={t("tutorial.skip")} sx={{ minHeight: 44 }}>
          {t("tutorial.skip")}
        </Button>
      </Box>

      <Box sx={{ flex: 1, position: "relative", display: "flex", alignItems: "stretch" }}>
        {step > 0 && (
          <Box
            onClick={handlePrev}
            sx={{ position: "absolute", left: 4, top: "50%", transform: "translateY(-50%)", zIndex: 1, cursor: "pointer", px: 1, py: 2, ...PULSE_LEFT }}
            aria-hidden="true"
          >
            <Typography sx={{ fontSize: "2rem", color: "text.secondary" }}>‹</Typography>
          </Box>
        )}

        <Box
          sx={{ flex: 1, px: 3, overflowY: "auto" }}
          onTouchStart={(e) => { startX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            const delta = e.changedTouches[0].clientX - startX.current;
            if (delta < -50 && step < SLIDE_COUNT - 1) setStep((s) => s + 1);
            if (delta > 50 && step > 0) setStep((s) => s - 1);
          }}
        >
          <Slide />
        </Box>

        {!isLast && (
          <Box
            onClick={handleNext}
            sx={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", zIndex: 1, cursor: "pointer", px: 1, py: 2, ...PULSE }}
            aria-hidden="true"
          >
            <Typography sx={{ fontSize: "2rem", color: "text.secondary" }}>›</Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ px: 3, pb: "calc(24px + env(safe-area-inset-bottom))" }}>
        <MobileStepper
          variant="dots"
          steps={SLIDE_COUNT}
          position="static"
          activeStep={step}
          sx={{ justifyContent: "center", bgcolor: "transparent", pb: 2 }}
          nextButton={<Box sx={{ width: 56 }} />}
          backButton={<Box sx={{ width: 56 }} />}
        />
        {isLast ? (
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={onComplete}
            aria-label={t("tutorial.start")}
            sx={{ minHeight: 56, borderRadius: 3, fontSize: "1.15rem", fontWeight: 700, boxShadow: 4 }}
          >
            {t("tutorial.start")} 🚀
          </Button>
        ) : (
          <Button
            fullWidth
            variant="outlined"
            onClick={handleNext}
            aria-label={t("tutorial.next")}
            sx={{ minHeight: 48, borderRadius: 2 }}
          >
            {t("tutorial.next")}
          </Button>
        )}
      </Box>
    </Box>
  );
}
