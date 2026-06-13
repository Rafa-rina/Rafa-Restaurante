CREATE DATABASE IF NOT EXISTS rafarestaurante;
USE rafarestaurante; 

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(100),
    item_id INT,
    price DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'Aberto',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id)
);

INSERT INTO users (username, password)
VALUES ('admin', '$2b$10$AVxi7HajEcjw/u93aFupGONEbUSVRuYdByLDQJd7y2gloMJQCU132');

INSERT INTO items (name, category)
VALUES ('Arroz Branco', 'Base'),
       ('Feijão Preto', 'Grão');
