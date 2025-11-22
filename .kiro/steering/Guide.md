---
inclusion: always
---

Read the readme.md and use it to update the project remove duplicate logic and files. 

Overview: Portfolio
A portfolio build on the reactive network that uses the users settings/percentages to manage assets based on changes to the prices
Users deposit (live mode - toggle on frontend) funds(react tokens or react(reactive network token) wll be used as gas fee).
It has when to auto sell(profit @ _%)
Stop loss @-_%  (when the market is crashing auto convert to stable coin - USDC).
Auto-buy @-_%
all percentages are selected by the users in the frontend and sent to backend that makes use of the reactive contracts to ensure this entire flow works.
Auto balance portfolio(sell the tokens that exceed selected token percentage distribution. E.g if user put BTC - 1%, ETH- 5%, either accurately selects to complete 100% or just chooses the first few (major ones) and clicks auto distribute it'll share the percentage equally among the other selected tokens). The percentage (100%) = Amount invested in portfolio != deposted amount. Users can choose amount to use to create a portfolio at that moment. 
So auto balance sells /buys to make the portfolio balanced.

users can still jsut buy a currency and sell on their own 

Mkae sure to read the entire existing projetc structure to completely nderstand the entire prohject structure, what has been implemnetd what logi isn't working correctly. The frontend wasn't displayng prices and percentage increases properly. In the app yu'll find the period we use to fetch the new prices again stick with that due to api limits but users can trigger manual refresh in frontend. its still accounted for.

Ask clarifying uestions that will help you be more accurate

Documentation:  https://dev.reactive.network/

