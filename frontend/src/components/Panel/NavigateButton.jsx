import { ArrowUpRight } from "lucide-react";

export default function NavigateButton({ lotName }) {
  return (
    <button className="navigate-btn">
      <ArrowUpRight />
      Navigate to {lotName}
    </button>
  );
}
