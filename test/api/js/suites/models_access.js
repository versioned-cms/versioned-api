const {elapsedSeconds} = require('lib/date_util')

module.exports = async function (c) {
  const name = c.uuid()
  const user = {
    name,
    email: `${name}@example.com`,
    password: 'admin'
  }
  let result = await c.post('valid create user', '/users', user)
  c.assert(!result.data.password)
  c.assert(!result.data.passwordHash)
  const createdAt = result.data.createdAt
  const id = result.data.id
  c.assert(id)
  c.assert(elapsedSeconds(createdAt) < 2)

  result = await c.post('valid login', '/login', user)
  const headers = {authorization: `Bearer ${result.data.token}`}
  c.assert(result.data.token)

  result = await c.put({it: 'attempted update of createdAt', status: 204}, `/users/${id}`, {createdAt: new Date()}, {headers})

  result = await c.get('get user with relationships', `/users/${id}?relationshipLevels=2`, {headers})
  c.assertEqual(result.data.createdAt, createdAt)
  c.assert(!result.data.password)
  c.assert(!result.data.passwordHash)
  const userWithRelationships = result.data
  const newName = user.name + ' updated'
  userWithRelationships.name = newName

  result = await c.put('update user with relationships', `/users/${id}`, userWithRelationships, {headers})

  result = await c.get('get user and check name was updated', `/users/${id}`, {headers})
  c.assertEqual(result.data.name, newName)
}
