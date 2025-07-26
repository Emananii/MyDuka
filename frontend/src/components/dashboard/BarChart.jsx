import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import PropTypes from "prop-types";

const CustomBarChart = ({ data, xKey, barKey, title }) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow border">
      <h2 className="text-md font-semibold text-gray-800 mb-4">{title}</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey={barKey} fill="#10b981" barSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

CustomBarChart.propTypes = {
  data: PropTypes.array.isRequired,
  xKey: PropTypes.string.isRequired,
  barKey: PropTypes.string.isRequired,
  title: PropTypes.string,
};

export default CustomBarChart;
