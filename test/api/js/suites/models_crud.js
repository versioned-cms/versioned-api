const {setIn} = require('lib/util')
const models = require('app/models/models')
const {crudTest} = require('../shared/models')

module.exports = async function (c) {
  const spaceId = c.data.space.id

  const model = {
    name: 'Article',
    spaceId: spaceId,
    coll: 'articles',
    model: {
      schema: {
        type: 'object',
        properties: {
          title: {type: 'string'},
          body: {type: 'string'}
        },
        required: ['title'],
        additionalProperties: false
      }
    }
  }

  await crudTest(c, `/${spaceId}`, 'models', model, {name: 'Article changed'})

  let result = await c.post('create articles model', `/${spaceId}/models`, model)
  const modelId = result.data.id

  const article = {
    title: 'My first article',
    body: 'Welcome to my blog!'
  }
  const updateArticle = {
    title: 'Title changed'
  }
  const articlesColl = await models.getColl(model)
  await crudTest(c, `/data/${spaceId}`, 'articles', article, updateArticle)

  await c.post('create article', `/data/${spaceId}/articles`, article)

  result = await c.get('check collection has one record in db stats', `/data/${spaceId}/articles?dbStats=1`)
  c.assertEqual(result.body.dbStats.count, 1, `expecting ${articlesColl} to have 1 doc`)

  const modelUpdated = setIn(model, ['model', 'schema', 'properties'], {title: {type: 'string'}, slug: {type: 'string'}})
  await c.put('update articles model with new schema property', `/${spaceId}/models/${modelId}`, modelUpdated)

  const anotherArticle = {
    title: 'My second article',
    slug: 'my-second-article'
  }
  await c.post('create another article with new property', `/data/${spaceId}/articles`, anotherArticle)

  await c.delete('delete articles model', `/${spaceId}/models/${modelId}`)

  const thirdArticle = {
    title: 'My third article',
    slug: 'my-third-article'
  }
  await c.post({it: 'trying to create an article without model', status: 404}, `/data/${spaceId}/articles`, thirdArticle)
}
