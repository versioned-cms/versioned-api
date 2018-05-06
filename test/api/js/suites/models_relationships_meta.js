const {last, deepMerge, getIn, setIn} = require('lib/util')

module.exports = async function (c) {
  const accountId = c.data.account.id
  let result = await c.post('create space for relationships meta test', `/${accountId}/spaces`, {name: 'Relationship Meta Test', accountId: accountId})
  const space = result.data
  const spaceId = space.id
  c.assert(spaceId)

  const relationships = {
    authors: {
      articles: {
        type: 'array',
        items: {type: 'string'},
        'x-meta': {
          relationship: {
            toType: 'articles',
            toField: 'author',
            type: 'one-to-many'
          }
        }
      }
    },
    articles: {
      author: {
        type: 'string',
        'x-meta': {
          relationship: {
            toType: 'authors',
            toField: 'articles',
            type: 'many-to-one'
          }
        }
      },
      categories: {
        type: 'array',
        items: {type: 'string'},
        'x-meta': {
          relationship: {
            toType: 'categories',
            toField: 'articles',
            type: 'many-to-many'
          }
        }
      }
    },
    categories: {
      articles: {
        type: 'array',
        items: {type: 'string'},
        'x-meta': {
          relationship: {
            toType: 'articles',
            toField: 'categories',
            type: 'many-to-many'
          }
        }
      }
    }
  }

  function modelWithRelationship (Model, relationshipPath, value) {
    const propertyName = last(relationshipPath.split('.'))
    const setValue = (value === undefined ? getIn(relationships, relationshipPath) : value)
    const schema = setIn({}, `properties.${propertyName}`, setValue)
    return deepMerge(Model.model, {schema})
  }

  const Author = {
    name: 'Author',
    spaceId: spaceId,
    coll: 'authors',
    model: {
      schema: {
        type: 'object',
        properties: {
          name: {type: 'string'}
          // articles: relationships.authors.articles
        },
        required: ['name'],
        additionalProperties: false
      }
    }
  }

  const Article = {
    name: 'Article',
    spaceId: spaceId,
    coll: 'articles',
    model: {
      schema: {
        type: 'object',
        properties: {
          title: {type: 'string'},
          body: {type: 'string'}
          // author: relationships.articles.author,
          // categories: relationships.articles.categories
        },
        required: ['title'],
        additionalProperties: false
      }
    }
  }

  const Category = {
    name: 'Category',
    spaceId: spaceId,
    coll: 'categories',
    model: {
      schema: {
        type: 'object',
        properties: {
          name: {type: 'string'}
          // articles: relationships.categories.articles
        },
        required: ['name'],
        additionalProperties: false
      }
    }
  }

  result = await c.post('create authors model without relationships', `/${accountId}/models`, Author)
  Author.id = result.data.id
  result = await c.post('create articles model without relationships', `/${accountId}/models`, Article)
  Article.id = result.data.id
  result = await c.post('create categories model without relationships', `/${accountId}/models`, Category)
  Category.id = result.data.id

  await c.put('add author/categories relationships to articles model', `/${accountId}/models/${Article.id}`,
    {model: deepMerge(modelWithRelationship(Article, 'articles.author'), modelWithRelationship(Article, 'articles.categories'))})

  result = await c.get('authors model should now have articles relationship', `/${accountId}/models/${Author.id}`)
  c.assertEqual(result.data.model.schema.properties.articles, relationships.authors.articles)

  result = await c.get('articles model should now have author/categories relationships', `/${accountId}/models/${Article.id}`)
  c.assertEqual(result.data.model.schema.properties.author, relationships.articles.author)
  c.assertEqual(result.data.model.schema.properties.categories, relationships.articles.categories)
  Article.model = result.data.model

  result = await c.get('categories model should now have articles relationship', `/${accountId}/models/${Category.id}`)
  c.assertEqual(result.data.model.schema.properties.articles, relationships.categories.articles)

  await c.put('remove categories relationship from articles', `/${accountId}/models/${Article.id}`,
    {model: modelWithRelationship(Article, 'articles.categories', null)})

  result = await c.get('articles model should no longer have categories relationship', `/${accountId}/models/${Article.id}`)
  c.assertEqual(result.data.model.schema.properties.author, relationships.articles.author)
  c.assert(!result.data.model.schema.properties.categories)

  result = await c.get('categories model should no longer have articles relationship', `/${accountId}/models/${Category.id}`)
  c.assert(!result.data.model.schema.properties.articles)

  result = await c.get('authors model should still have articles relationship', `/${accountId}/models/${Author.id}`)
  c.assertEqual(result.data.model.schema.properties.articles, relationships.authors.articles)

  await c.delete('remove articles model', `/${accountId}/models/${Article.id}`)

  await c.get({it: 'articles model is gone', status: 404}, `/${accountId}/models/${Article.id}`)

  result = await c.get('authors model no longer has articles relationship', `/${accountId}/models/${Author.id}`)
  c.assert(!result.data.model.schema.properties.articles)
}