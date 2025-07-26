import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import PropTypes from "prop-types";

const CustomLineChart = ({ data, xKey, lineKey, title }) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow border">
      <h2 className="text-md font-semibold text-gray-800 mb-4">{title}</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey={lineKey} stroke="#6366f1" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

CustomLineChart.propTypes = {
  data: PropTypes.array.isRequired,
  xKey: PropTypes.string.isRequired,
  lineKey: PropTypes.string.isRequired,
  title: PropTypes.string,
};

export default CustomLineChart;
