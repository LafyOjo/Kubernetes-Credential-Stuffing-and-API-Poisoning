import { Card, CardContent } from "./ui/card";

const circumference = 2 * Math.PI * 28;

const MetricCard = ({ title, value, percentage, delta }) => {
  const offset = circumference - (percentage / 100) * circumference;
  return (
    <Card className="flex items-center p-4 space-x-4">
      <div className="relative">
        <svg className="w-16 h-16" viewBox="0 0 64 64">
          <circle
            className="text-gray-200"
            strokeWidth="8"
            stroke="currentColor"
            fill="transparent"
            r="28"
            cx="32"
            cy="32"
          />
          <circle
            className="text-blue-500"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            stroke="currentColor"
            fill="transparent"
            r="28"
            cx="32"
            cy="32"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
          {Math.round(percentage)}%
        </span>
      </div>
      <CardContent className="p-0">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-2xl font-bold">{value}</p>
        <p className={`text-sm ${delta >= 0 ? "text-green-500" : "text-red-500"}`}>
          {delta >= 0 ? "+" : ""}
          {delta}%
        </p>
      </CardContent>
    </Card>
  );
};

export default MetricCard;
