const { buildSchema } = require("graphql");

module.exports = buildSchema(
  `
    input UserInputDataSignup{
        username: String!
        password: String!
        email: String!
        confirmPassword: String!
    }

    input UserCardInputData{
        name: String!
        source: String!
        category: String!
        author: String!
    }

    input CardUpdateData{
        _id: String!
        name: String!
        source: String!
        category: String!
        author: String!
    }

    input HistoryInputData{
        userId: ID!
        name: String!
        source: String!
        date: String!
    }

    type HistoryData{
        name: String!
        source: String!
        date: String!
    }

    type User{
        _id: ID!
        username: String!
        email: String!
        password: String!
        status: String!
    }

    type Confirmation{
        userId: ID!
        expiredAt: String!
    }

    type AuthData{
        token: String!
        userId: String!
    }

    type Card{
        author: ID!
        name: String!
        source: String!
        category: String!
    }

    type OutputCard{
        _id: String!
        name: String!
        source: String!
        category: String!
    }

    type RootQuery{
        user(_id: ID!): User!
        login(username: String!, password: String!): AuthData!
        getData(_id: ID!): [Card!]!
        getCategories(_id: ID!): [String!]!
        getCards(_id: ID!, category: String!): [OutputCard!]!
        getCard(userId: ID!, cardId: ID!): OutputCard!
        getHistories(userId: ID!): [HistoryData!]!
    }

    type RootMutation{
        createUser(userInput: UserInputDataSignup): User!
        confirmation(_id: ID!): Confirmation!
        resendConfirmation(username: String!): String!
        createCard(cardInput: UserCardInputData): String!
        updateCard(cardUpdateData: CardUpdateData): String!
        deleteCard(userId: ID!, cardId: ID!): String!
        deleteAllSelectedCards(userId: ID!, cardIds: [ID!]!): String!
        createHistory(historyInputData: HistoryInputData): String!
    }

    schema{
        query: RootQuery
        mutation: RootMutation
    }
    `
);
