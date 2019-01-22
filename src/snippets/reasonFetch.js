import refmt from 'reason';

export default {
  language: 'ReasonML',
  name: 'Fetch API',
  options: [],
  generate: ({
    appId,
    variableName,
    operationType,
    operationName,
    operation,
    options,
  }) => {
    // snippet here
    return refmt.printRE(
      refmt.parseRE(`type schoolPerson = Teacher | Director | Student(string);

    let greeting = person =>
      switch (person) {
      | Teacher => "Hey Professor!"
      | Director => "Hello Director."
      | Student("Richard") => "Still here Ricky?"
      | Student(anyOtherName) => "Hey, " ++ anyOtherName ++ "."
      };`),
    );
  },
};
