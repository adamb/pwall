const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Home</title>
</head>
<body>
    <h1>Finca del Mar Monitoring Project</h1>
    <p>This site shows some of the status of my Tesla Powerwall system.</p>
    <p><a href="/battery">Battery Status</a> - View the current battery status and remaining hours at the current usage level.</p>
    <p><a href="/voltage">Voltage Data</a> - View the voltage data for the last hour.</p>

    <h2>Using Cloudflare to monitor a Tesla Energy Gateway</h2>

    <p>One of the challenges of living in Puerto Rico is the flakey power system.  <a href="https://www.elnuevodia.com/noticias/gobierno/notas/pedro-pierluisi-ordena-investigar-el-apagon-del-miercoles-y-activa-la-guardia-nacional-esto-no-se-debe-repetir/">Read more about recent power issues here.</a> Our place has 51 solar
    panels and 4 powerwalls.  Even with this setup we are living on the edge at times.  We noticed that
    even when the grid is on, the lights flicker and appliances are stressed.  To get a handle on this 
    I decided to start collecting stats on the voltage.  The TEG (Tesla Energy Gateway) has an API so you
    can pull stats like the voltage it's receiving form the power company, Luma Energy  in our case.
    </p>

    <p>
    Tesla has a great app, but it doesn't show this information.  Also the app is only for the owner of the system,
    I would like other folks, like our caretaker who lives there to be able to know how much power the house is 
    using and how much time is left on the battery if the power is out.  Before this I would have to monitor
    this and text her.  Now she can see how much power the house is using and how much battery is left, and 
    most importantly, how much time is left on the batteries.
    </p>

    <h2>Using Cloudflare and Aider</h2>

    <p>When I came up with this idea I had recently heard about <a href="https://aider.chat">Aider</a>, a coding assistant.  I've built this
    project using Aider to write most of the code.  Aider is pretty great and it's been an inspiration to me.
    I'm going to post some more details about my experience using Aider in a future post.</p>

    <p>The TEG has an API but to access it you have to be inside your LAN. To get around this I used a Cloudflare
    tunnel.  This let's me securely expose the TEG but only to my code using a secret id and token.</p>

    <p>I also used the Cloudflare workers and KV storage to keep track of the stats over time.  The voltages you 
    see in voltage page are collected every two minute by a Cloudflare worker that logs into my TEG and grabs
    stats every two minutes.</p>

    <p>All the code for this is available in my GitHub repo: <a href="https://github.com/adamb/pwall">https://github.com/adamb/pwall</a></p>

</body>
</html>
`;

export default htmlContent;
