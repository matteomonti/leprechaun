const path = require('path');
const bigint = require('big-integer');

const chalk = require('chalk');
const figlet = require('figlet');
var inquirer = require('inquirer');

const client = require('./client/client.js');
const verifier = require('./dictionary/verifier.js');

console.log(chalk.red(figlet.textSync('Leprechaun')));

var my_client;

inquirer.prompt([
    {
        type: 'list',
        name: 'action',
        message: 'Welcome to Leprechaun! Do you want to:',
        choices: [
            'Load from disk',
            'Signup',
            'Signin'
        ]
    }
]).then(function(answer)
{
    var handlers = {
        'Load from disk': load,
        'Signup': signup,
        'Signin': signin
    };

    handlers[answer.action]();
});

var load = function()
{
    try
    {
        console.log();
        console.log(chalk.yellow('Loading from disk..'));
        my_client = new client.client();

        console.log(chalk.yellow('Starting to listen for updates..'));
        my_client.listen();
        console.log(chalk.green('All set and ready to sail!'));
        console.log();
        main();
    }
    catch(error)
    {
        console.log();
        console.log(chalk.red('D\'oh, there has been an error:'));
        console.log(chalk.red(JSON.stringify(error)));
        console.log(chalk.yellow('Maybe try to signin or signup from scratch?'));
        console.log();
    }
};

var signup = function()
{
    inquirer.prompt([
        {
            type: 'input',
            name: 'user',
            message: 'Enter your username:'
        },
        {
            type: 'password',
            name: 'password',
            message: 'Enter your password:'
        },
        {
            type: 'password',
            name: 'again',
            message: 'Enter your password again:'
        }
    ]).then(async function(answers)
    {
        if(answers.password != answers.again)
        {
            console.log(chalk.red('Passwords don\'t match, try again!'));
            signup();
        }
        else
        {
            try
            {
                my_client = await client.signup(answers.user, answers.password);
                console.log(chalk.green('Signup successful! Welcome on board!'));
                console.log(chalk.yellow('Starting to listen for updates..'));
                my_client.listen();
                console.log(chalk.green('All set and ready to sail!'));
                console.log();
                main();
            }
            catch(error)
            {
                console.log();
                console.log(chalk.red('D\'oh, there has been an error:'));
                console.log(chalk.red(JSON.stringify(error)));
                console.log(chalk.yellow('Maybe try again?'));
                console.log();
                signup();
            }
        }
    });
};

var signin = function()
{
    inquirer.prompt([
        {
            type: 'input',
            name: 'user',
            message: 'Enter your username:'
        },
        {
            type: 'password',
            name: 'password',
            message: 'Enter your password:'
        }
    ]).then(async function(answers)
    {
        try
        {
            my_client = await client.signin(answers.user, answers.password);
            console.log();
            console.log(chalk.green('Signin successful! Welcome back!'));
            console.log();
            console.log(chalk.blue(' > We went ahead and saved your credentials locally.'));
            console.log(chalk.blue(' > Next time you can just select `Load from disk` and you will be good to go.'))
            console.log(chalk.blue(' > You are welcome :D'));
            console.log();
            console.log(chalk.yellow('Starting to listen for updates..'));
            my_client.listen();
            console.log(chalk.green('All set and ready to sail!'));
            console.log();
            main();
        }
        catch(error)
        {
            console.log();
            console.log(chalk.red('D\'oh, there has been an error:'));
            console.log(chalk.red(JSON.stringify(error)));
            console.log(chalk.yellow('Maybe try again?'));
            console.log();
            signin();
        }
    });
};

var main = function()
{
    inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Do you want to:',
            choices: [
                'Check your balance',
                'Send some LEPs',
                'Exit'
            ]
        }
    ]).then(function(answer)
    {
        var handlers = {
            'Check your balance': balance,
            'Send some LEPs': send,
            'Exit': exit
        };

        handlers[answer.action]();
    });
};

var balance = async function()
{
    var balance = await my_client.balance();

    console.log();
    console.log('Your balance is:', chalk.green(balance), chalk.green('LEPs'));
    console.log();
    main();
}

var send = async function()
{
    inquirer.prompt([
        {
            type: 'input',
            name: 'recipient',
            message: 'Who do you want to send to?'
        },
        {
            type: 'input',
            name: 'amount',
            message: 'How much do you want to send?'
        }
    ]).then(async function(answers)
    {
        try
        {
            await my_client.send(answers.recipient, bigint(answers.amount));

            console.log();
            console.log(chalk.red('Yay! LEPs successfully sent!'));
            console.log();

            main();
        }
        catch(error)
        {
            console.log();
            console.log(chalk.red('D\'oh, there has been an error:'));
            console.log(chalk.red(JSON.stringify(error)));
            console.log(chalk.yellow('Maybe try again?'));
            console.log();
            send();
        }
    });
}

var exit = function()
{
    console.log(chalk.red('Bye!'));
    console.log();
    process.exit();
}
