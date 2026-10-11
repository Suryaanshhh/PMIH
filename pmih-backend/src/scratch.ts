import { createClientSchema, updateClientSchema, listClientsQuerySchema } from './schemas/client.schema';

console.log(createClientSchema.safeParse({ name: '   ' }).success);          // expect false
console.log(createClientSchema.parse({ name: ' Acme ' }));                    // name trimmed, keyContacts: []
console.log(updateClientSchema.parse({ name: 'Acme' }));                      // expect NO keyContacts key
console.log(listClientsQuerySchema.parse({ page: '2' }));                     // page: 2, pageSize: 20
console.log(createClientSchema.safeParse({ name: 'A', keyContacts: [{ name: 'X', email: 'bad' }] }).success); // false