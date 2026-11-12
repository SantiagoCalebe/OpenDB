export function loadDemo(db) {
  db.run(
    "CREATE TABLE customers(id INTEGER PRIMARY KEY, name TEXT, city TEXT);" +
    "INSERT INTO customers VALUES (1,'Anna Reed','Victoria'), (2,'Lucas Stone','Portland'), (3,'Maria Lane','Salem');" +
    "CREATE TABLE orders(id INTEGER PRIMARY KEY, customer_id INTEGER REFERENCES customers(id), amount REAL, status TEXT);" +
    "INSERT INTO orders VALUES (101,1,49.90,'delivered'), (102,2,85.50,'processing'), (103,3,19.90,'delivered');" +
    "CREATE VIEW order_summary AS SELECT customers.name, orders.amount, orders.status FROM orders JOIN customers ON customers.id=orders.customer_id;"
  );
}

