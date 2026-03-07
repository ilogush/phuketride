type FormFeedbackTone = "error" | "success" | "hint";

type FormFeedbackMessageProps = {
    message?: string | null;
    tone?: FormFeedbackTone;
    className?: string;
};

const toneClassName: Record<FormFeedbackTone, string> = {
    error: "text-red-600",
    success: "text-green-700",
    hint: "text-gray-500",
};

export default function FormFeedbackMessage({
    message,
    tone = "hint",
    className = "",
}: FormFeedbackMessageProps) {
    if (!message) {
        return null;
    }

    return <p className={`${toneClassName[tone]} ${className}`.trim()}>{message}</p>;
}
