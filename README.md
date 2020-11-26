# Moving Day

[Live App](https://moving-day-client.vercel.app/)

[Moving Day Client Repo](https://github.com/matt-ros/moving-day-client)

## Summary

Moving Day was created to ease the stress of moving by keeping users organized during the process.  All your information can be kept in one place!

## API Endpoints

### `/auth/login`

`POST` logs in a user with valid credentials

### `/boxes`

`GET` retrieves information for all boxes for the currently logged in user

`POST` adds a new box associated with the current user

### `/boxes/:box_id`

`GET` retrieves information for a particular box if it is associated with the current user

`PATCH` updates the box's information

`DELETE` deletes the box

### `/contacts`

`GET` retrieves information for all contacts for the currently logged in user

`POST` adds a new contact associated with the current user

### `/contacts/:contact_id`

`GET` retrieves information for a particular contact if it is associated with the current user

`PATCH` updates the contact's information

`DELETE` deletes the contact

### `/lists`

`GET` retrieves information for all lists for the currently logged in user

`POST` adds a new list associated with the current user

### `/lists/:list_id`

`GET` retrieves information for a particular list if it is associated with the current user

`PATCH` updates the list's information

`DELETE` deletes the list

### `/users`

`POST` creates a new user

`PATCH` updates notes or moving date for the currently logged in user

`GET` retrieves the current user's information

### `/getAll`

`GET` retrieves user information and all boxes, contacts, and lists for the current user

## Technology

* Node.js
* Express
* PostgreSQL
