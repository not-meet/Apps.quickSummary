###Apps.QuickSummary
<br />
<div align="center">
  <h3 align="center">Quick summary feature for RocketChat!</h3>
</div>




### ⚙️ Installation

-   Every RocketChat Apps runs on RocketChat Server, thus everytime you wanna test you need to deploy the app with this note. lets start setting up:

1. Clone the repo
    ```sh
    git clone https://github.com/<yourusername>/Apps.QuickReplies
    ```
2. Install NPM packages
    ```sh
    npm ci
    ```
3. Deploy app using:

    ```sh
    rc-apps deploy --url <url> --username <username> --password <password>
    ```

### ⚙️ seting up the summary ai 

1. U need to get the api key of either chat gpt or groq use 
    ```sh 
    /quickhistory config <modal name either groq or gpt> <api key>
    ```
