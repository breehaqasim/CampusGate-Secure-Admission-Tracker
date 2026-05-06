interface Column {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
}

interface TableProps {
  columns: Column[];
  data: Record<string, any>[];
}

export function Table({ columns, data }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#2a2a2a]">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 text-[#a0a0a0] text-sm text-${column.align || 'left'}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={index}
              className="border-b border-[#2a2a2a] hover:bg-[#2a2a2a]/30 transition-colors"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-4 text-white text-${column.align || 'left'}`}
                >
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
