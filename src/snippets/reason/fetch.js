import refmt from 'reason';

export default {
  language: 'ReasonML',
  prismLanguage: 'reason',
  name: 'bs-fetch',
  options: [],
  generate: ({
    serverUrl,
    variableName,
    operationType,
    operationName,
    operation,
    options,
  }) => {
    // snippet here
    return refmt.printRE(
      refmt.parseRE(`
let serverUrl = "${serverUrl}"

let ${variableName} = [%graphql
{|
${operation}
|}
]

let payload = Js.Dict.empty();
Js.Dict.set(payload, "${operationType}", Js.Json.string(${variableName}));

Js.Promise.(
  Fetch.fetch(serverUrl,
    Fetch.RequestInit.make(
      ~method_=Post,
      ~body=Fetch.BodyInit.make(Js.Json.stringify(Js.Json.object_(payload))),
      ~headers=Fetch.HeadersInit.make({"Content-Type": "application/json"}),
      ()
    )
  )
  |> then_(Fetch.Response.json)
  |> then_(json => print_endline(json) |> resolve)
);`),
    );
  },
};
