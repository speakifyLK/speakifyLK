import {
  AutocompleteInput,
  Create,
  NumberInput,
  ReferenceInput,
  SimpleForm,
  TextInput,
  required,
} from "react-admin";

export const LessonCreate = () => {
  return (
    <Create>
      <SimpleForm>
        <TextInput source="title" validate={[required()]} label="Title" />
        <ReferenceInput source="unitId" reference="units" perPage={1000}>
          <AutocompleteInput label="Unit" />
        </ReferenceInput>
        <NumberInput source="order" validate={required()} label="Order" />
      </SimpleForm>
    </Create>
  );
};
