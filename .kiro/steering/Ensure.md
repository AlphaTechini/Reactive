This doc summarises the features that need to be implemented for the app to be considered complete/working.


THis is the flow:

User comes in to the app. Simulation renders by default no need to add any homepage to make users choose. The live mode can only be switched to by the button that is alredy ther on the navbar(at the top).

The user clicks create a portfolio.

Create portfolio page: Visual style: card

Name:
Description:
Deposit Amount:  (whatever the user puts here will be deducted from the total 10,000 and it'll display in the portfolio value(within the portfolio itself. This is where you attach the total amount of all the tokens in the portfolio. it is = to the deposit amoount if the user hasn't bought any tokens yet.)). remember since its dedeucted from the 100000 only the remainder will be displayed no more the 10,000 in the dashboard(wherever the 100000 was being displayed)

This way the same thing repeats should the user create another portfolio.

Then after the portfolio creation the user is redirected to the just create portfolio:
portfolios/:[portfolio name] thats why i asked you to make it dynamic that way we just change contents and values but the arrangement and styling should remain consistent accross different portfolios.

The user should be redirected to the [portfoilioname]/settings page where he chooses the portfolio settings:
The tokens will be showed here and beside each token an input box or dropdown where the user enters percentage for that currency. Note: percentage can only be set to whole numbers no decimals. 
when only one token is remaining for the percentage to be set auto substract the total so far from 100 and provide it in that input box for the last one. Noe: total percentage assigned to the currencies can be more than 100. 

Then after that the Sell %: how many percent increase form the last fetch of the token price should we sell the token at. 
Same for Buy% but decrease this time. 
Stop Loss: How many percent decrease from the last fetch should we sell off that token for USDC(stable coin)
Auto Balancer - off / on :  If on then we will observe the percentage distributed to each token strictly if any token(due to buying or selling) reduces or increases past that percentage (in realtion to the current portfolio value no more initial value) then we take the opposite action. if > than, we sell exactly the amout to balance it . If < than, we buy more of that token to make up the percentage in relation to the current portfolio value. 
If off then none of this will be applied.

Then aat the buttom Upload setting button. This sends the users choice and info to our backend and maybe even db for future interactions.
 

 After settings upload th main portfolio page:


N within the individual portfolios we have the side bar for tokens bought, their current prices and percentage change from lastest fetch

Then the main window will have: No. of Currencies:      Portfolio Value:
These two appear at the top

Then top right we have the setting icon which redirects to the :[portfoilioname]/settings route.

WE also include Profit: %       and  Loss: %  
These will be how mucha has been made or lost based on the trading using the portfolio settings and the webhook that listens to see if the conditions(percentage increase/decrease) are met after each price fetch(compared to the last fetch). 
The percentage is added up with each increase so that the total from the portfolio creation to that point is what is seen. Lets say after 5h profit= 5% after the next fecth profit of 0.2% was made then the new profit : 5.2%. Same for loss


Memecoins percentage      altcoins percentage

stable coin %               individual coins %
These are the percentage of each category of couns in the portfolio. It can be 0% if the portfolio dosen't have any of that particular category.



Note that i have written two components side by side this is to show you that the styling can use display: grid and column: 1fr 1fr in tailwind.


Then withdraw and deposit buttons at the buttom. 

if the user clicks deposit. He should se a card with input bar and label enter amount. The amount entered should be <= the remaining balance(outside the portfolio). Then after the user clicks deposit. It should auto split the amount  and use it to buy more of the currencies based on the user's distriuted percentages per currency from the portfolio setting

This flow will be applied to both the main/live and simulation mode the only difference is a lot of custom logic and calculation handled by us in the simulation as for ive we use the reactive smart contracts for those.

