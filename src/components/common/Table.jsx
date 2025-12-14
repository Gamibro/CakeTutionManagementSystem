import { Children, Fragment, cloneElement, isValidElement } from "react";

const Table = ({ headers, children, className = "" }) => {
  const processedRows = Children.map(children, (row) => {
    if (!isValidElement(row)) return row;

    let columnIndex = 0;
    const decorateNode = (node) => {
      if (!isValidElement(node)) return node;

      if (node.type === Fragment) {
        const fragmentChildren = Children.map(
          node.props.children,
          decorateNode
        );
        return cloneElement(node, node.props, fragmentChildren);
      }

      const rawHeader = Array.isArray(headers)
        ? headers[columnIndex] ?? ""
        : "";
      const headerLabel =
        typeof rawHeader === "string"
          ? rawHeader
          : rawHeader?.label ?? rawHeader?.title ?? "";

      columnIndex += 1;
      return cloneElement(node, {
        ...node.props,
        "data-header": headerLabel,
      });
    };

    const processedCells = Children.map(row.props.children, decorateNode);

    return cloneElement(row, row.props, processedCells);
  });

  return (
    <div className={`responsive-table overflow-x-auto ${className}`}>
      <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 table-animated">
          {processedRows}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
