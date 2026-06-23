import { db } from '../config/database'
import { gte, sql } from 'drizzle-orm'
import { purchaseModel } from '../schemas'

export const getItemSummary = async () => {
  const [rows] = await db.execute(sql`
    SELECT 
      i.item_name,
      SUM(s.quantity) AS totQty,
      AVG(i.avg_price) AS price
    FROM store_transaction AS s
    JOIN item AS i
      ON i.item_id = s.item_id
    GROUP BY i.item_id, i.item_name;
  `)

  return rows
}

export const getRemainingAmount = async () => {
  const [rows] = await db.execute(sql`
   SELECT 
  c.customer_id,
  c.name AS customer_name,
  COALESCE(MAX(t2.opening_balance),0) AS opening_balance,
  COALESCE(SUM(sm.total_amount), 0) AS total_sales,
  COALESCE(SUM(sm.discount_amount), 0) AS total_discount,
  COALESCE(SUM(IFNULL(t.total_received,0)), 0) AS total_received,
  COALESCE(
    IFNULL(MAX(t2.opening_balance),0)
    - IFNULL(SUM(sm.total_amount),0)
    - IFNULL(SUM(t.total_received),0)
    - IFNULL(SUM(sm.discount_amount),0),
  0) AS unpaid_amount
FROM customer AS c
LEFT JOIN (
  SELECT 
    customer_id,
    SUM(total_amount) AS total_amount, 
    SUM(discount_amount) AS discount_amount
  FROM sales_master
  GROUP BY customer_id
) AS sm ON sm.customer_id = c.customer_id
LEFT JOIN (
  SELECT 
    customer_id, 
    SUM(amount) AS total_received
  FROM transaction
  WHERE transaction_type = 'received'
  GROUP BY customer_id
) AS t ON t.customer_id = c.customer_id
LEFT JOIN (
  SELECT customer_id, IF(type='credit',-(opening_amount),opening_amount) AS opening_balance 
  FROM opening_balance 
  WHERE is_party = 1
) AS t2 ON t2.customer_id = c.customer_id
GROUP BY c.customer_id, c.name;

  `)

  return rows
}

export const getCashInHand = async () => {
  const [rows] = await db.execute(sql`
    SELECT SUM(t1.amount) as 'cashInHand'
FROM (SELECT IFNULL(opening_amount,0) as amount
FROM opening_balance WHERE is_party= 0 AND customer_id IS NULL AND type='debit'
UNION
SELECT IFNULL(SUM(amount),0) as amount
FROM  
transaction WHERE transaction_type='recieved' AND is_cash=1 
UNION
SELECT IFNULL(CONCAT('-',SUM(amount)),0) as amount
FROM  
transaction WHERE transaction_type='payment' AND is_cash=1) AS t1 ;
  `)

  return rows
}

export const getProfitSummary = async () => {
  // const [rows] = await db.execute(sql`
  //   SELECT
  //     ROW_NUMBER() OVER (ORDER BY MIN(sales_master.sale_date)) AS id,
  //     DATE_FORMAT(sales_master.sale_date, '%M %Y') AS month,
  //     COUNT(DISTINCT sales_master.sale_master_id) AS number_of_sales,
  //     SUM(sales_details.amount) AS total_sales_amount,
  //     SUM((sales_details.unit_price - sales_details.avg_price) * sales_details.quantity)
  //       - SUM(sales_master.discount_amount) AS net_profit
  //   FROM sales_details
  //   INNER JOIN item ON item.item_id = sales_details.item_id
  //   INNER JOIN sales_master ON sales_master.sale_master_id = sales_details.sale_master_id
  //   WHERE sales_master.sale_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
  //   GROUP BY DATE_FORMAT(sales_master.sale_date, '%M %Y')
  //   ORDER BY MIN(sales_master.sale_date);
  // `)
  const [rows] = await db.execute(sql`
    SELECT 
    ROW_NUMBER() OVER (ORDER BY table1.date) AS id,
    table1.month,
    SUM(table1.number_of_sales) AS number_of_sales,
    SUM(table1.total_sales_amount) AS total_sales_amount,
    SUM(table1.gross_profit) AS gross_profit,
    SUM(table1.total_expense) AS total_expense,
    SUM(table1.gross_profit)-SUM(table1.total_expense) AS net_profit
FROM
(
    -- SALES DATA
    SELECT
        DATE_FORMAT(MIN(sales_master.sale_date), '%Y-%m-01') AS date,
        DATE_FORMAT(MIN(sales_master.sale_date), '%M %Y') AS month,
        COUNT(DISTINCT sales_master.sale_master_id) AS number_of_sales,
        SUM(sales_details.amount) AS total_sales_amount,
        SUM((sales_details.unit_price - sales_details.avg_price) * sales_details.quantity)
          - SUM(sales_master.discount_amount) AS gross_profit,
        0 AS total_expense
    FROM sales_details
    INNER JOIN item 
        ON item.item_id = sales_details.item_id
    INNER JOIN sales_master 
        ON sales_master.sale_master_id = sales_details.sale_master_id
    WHERE sales_master.sale_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY DATE_FORMAT(sales_master.sale_date, '%Y-%m')

    UNION ALL

    -- EXPENSE DATA
    SELECT
        DATE_FORMAT(MIN(expense.expense_date), '%Y-%m-01') AS date,
        DATE_FORMAT(MIN(expense.expense_date), '%M %Y') AS month,
        0 AS number_of_sales,
        0 AS total_sales_amount,
        0 AS gross_profit,
        SUM(expense.amount) AS total_expense
    FROM expense
    WHERE expense.expense_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
    GROUP BY DATE_FORMAT(expense.expense_date, '%Y-%m')
) AS table1
GROUP BY table1.month, table1.date
ORDER BY table1.date;

  `)
  return rows
}

export const getBankBalanceSummary = async () => {
  const [rows] = await db.execute(sql`
    SELECT 
      FLOOR(RAND() * 1000000) AS id, -- random id between 0 and 999999
      t1.bank_name, 
      SUM(t1.current_balance) AS current_balance 
    FROM (
      SELECT 
        bank_account.bank_name, 
        SUM(IF(type='debit', opening_amount, -(opening_amount))) AS current_balance
      FROM opening_balance 
      INNER JOIN bank_account ON bank_account.bank_account_id = opening_balance.bank_account_id
      WHERE opening_balance.bank_account_id IS NOT NULL
      GROUP BY opening_balance.bank_account_id

      UNION

      SELECT 
        bank_account.bank_name, 
        IFNULL(SUM(amount), 0) AS current_balance
      FROM transaction 
      INNER JOIN bank_account ON bank_account.bank_account_id = transaction.bank_id
      GROUP BY bank_account.bank_account_id
    ) AS t1
    GROUP BY t1.bank_name
    HAVING current_balance > 0;
  `)
  return rows
}

export const getPurchaseSummary = async () => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const result = await db
    .select({
      yearMonth: sql<string>`DATE_FORMAT(${purchaseModel.purchaseDate}, '%Y-%m')`,
      totalAmount: sql<number>`SUM(${purchaseModel.totalAmount})`,
    })
    .from(purchaseModel)
    .where(gte(purchaseModel.purchaseDate, sixMonthsAgo))
    .groupBy(sql`DATE_FORMAT(${purchaseModel.purchaseDate}, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(${purchaseModel.purchaseDate}, '%Y-%m')`);

  const dataWithIdAndFormattedMonth = result.map((item) => {
    const [year, month] = item.yearMonth.split("-");
    const date = new Date(Number(year), Number(month) - 1); // JS months are 0-based
    const formattedMonth = date.toLocaleString("en-US", { month: "long", year: "numeric" });

    return {
      id: Math.floor(Math.random() * 1_000_000_000_0000),
      month: formattedMonth, // e.g., "October 2025"
      totalAmount: item.totalAmount,
    };
  });

  return dataWithIdAndFormattedMonth;
};
