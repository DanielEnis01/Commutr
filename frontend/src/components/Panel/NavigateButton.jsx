import { ArrowUpRight } from "lucide-react";

export default function NavigateButton({ lotName, onClick }) {
  return (
    <button className="navigate-btn" onClick={onClick}>
      <ArrowUpRight />
      Navigate to {lotName}
    </button>
  );
}

