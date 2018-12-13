CREATE TABLE users (
  id SERIAL,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  zipcode VARCHAR(5),
  PRIMARY KEY (id)
);

CREATE TABLE notes (
	id SERIAL,
	name VARCHAR(100) NOT NULL,
	userId INTEGER NOT NULL,
	title VARCHAR(255),
	content TEXT,
	PRIMARY KEY (id),
	FOREIGN KEY (userId) REFERENCES users(id)
);

CREATE TABLE toDo (
	id SERIAL,
	userId INTEGER NOT NULL,
	title VARCHAR(255),
	done BOOLEAN,
	PRIMARY KEY (id),
	FOREIGN KEY (userId) REFERENCES users(id)
);

INSERT INTO users (username,password,zipcode) VALUES ('user','password','84047');